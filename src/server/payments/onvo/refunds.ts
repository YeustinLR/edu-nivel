import "server-only";

import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ProviderMode,
  RefundStatus,
  SubscriptionStatus,
} from "@/generated/prisma/client";
import { resolveSubscriptionPeriod } from "@/modules/subscriptions/domain/subscription-period";
import { prisma } from "@/server/db/prisma";
import { getOnvoRefund } from "@/server/payments/onvo/client";
import { logOnvoPaymentEvent } from "@/server/payments/onvo/payment-log";
import type { OnvoRefund } from "@/server/payments/onvo/schemas";
import {
  isRetryableSerializableConflict,
  MAX_SERIALIZABLE_ATTEMPTS,
  waitBeforeSerializableRetry,
} from "@/server/payments/onvo/serializable-transaction";

export type OnvoRefundReconciliationOutcome =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "REQUIRES_REVIEW"
  | "ALREADY_APPLIED";

export type OnvoRefundReconciliationResult = {
  paymentId: string;
  refundCaseId: string;
  outcome: OnvoRefundReconciliationOutcome;
};

export class ManualRefundError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ManualRefundError";
  }
}

export async function flagProviderRefundWithoutId(input: {
  paymentId: string;
  providerStatus: "refunded" | "partially_refunded";
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
  });
  if (!payment) {
    throw new ManualRefundError("PAYMENT_NOT_FOUND", "El pago no existe.");
  }

  const errorCode =
    input.providerStatus === "refunded"
      ? "REFUND_ID_REQUIRED"
      : "PARTIAL_REFUND_NOT_SUPPORTED";

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentRefund.findFirst({
        where: {
          paymentId: payment.id,
          status: {
            in: [
              RefundStatus.REQUESTED,
              RefundStatus.PENDING,
              RefundStatus.REQUIRES_REVIEW,
              RefundStatus.SUCCEEDED,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!existing) {
        await tx.paymentRefund.create({
          data: {
            paymentId: payment.id,
            provider: PaymentProvider.ONVO,
            providerMode: payment.providerMode,
            expectedAmountMinor:
              payment.receivedAmountMinor ?? payment.expectedAmountMinor,
            currency: payment.currency,
            status: RefundStatus.REQUIRES_REVIEW,
            providerStatus: input.providerStatus,
            errorCode,
            errorMessage:
              "ONVO reportó un reembolso, pero falta registrar su identificador.",
          },
        });
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerStatus: input.providerStatus,
          errorCode,
          errorMessage:
            "El reembolso requiere conciliación administrativa por refundId.",
        },
      });
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerStatus: input.providerStatus,
        errorCode,
        errorMessage:
          "El reembolso requiere conciliación administrativa por refundId.",
      },
    });
  }
}

function providerModeFromOnvo(mode: "test" | "live"): ProviderMode {
  return mode === "test" ? ProviderMode.TEST : ProviderMode.LIVE;
}

function parseProviderDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function effectiveRefundDate(refund: OnvoRefund): Date {
  return (
    parseProviderDate(refund.updatedAt) ??
    parseProviderDate(refund.createdAt) ??
    new Date()
  );
}

export async function createManualRefundCase(input: {
  paymentId: string;
  requestedById: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: {
      refunds: {
        where: {
          status: {
            in: [
              RefundStatus.REQUESTED,
              RefundStatus.PENDING,
              RefundStatus.REQUIRES_REVIEW,
              RefundStatus.SUCCEEDED,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!payment) {
    throw new ManualRefundError("PAYMENT_NOT_FOUND", "El pago no existe.");
  }

  if (
    payment.status !== PaymentStatus.SUCCEEDED ||
    !payment.appliedAt ||
    !payment.providerPaymentIntentId
  ) {
    throw new ManualRefundError(
      "PAYMENT_NOT_REFUNDABLE",
      "Solo se puede reembolsar un pago confirmado y aplicado.",
    );
  }

  if (payment.refunds[0]) return payment.refunds[0];

  try {
    return await prisma.paymentRefund.create({
      data: {
        paymentId: payment.id,
        provider: PaymentProvider.ONVO,
        providerMode: payment.providerMode,
        expectedAmountMinor:
          payment.receivedAmountMinor ?? payment.expectedAmountMinor,
        currency: payment.currency,
        requestedById: input.requestedById,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.paymentRefund.findFirst({
        where: {
          paymentId: payment.id,
          status: {
            in: [
              RefundStatus.REQUESTED,
              RefundStatus.PENDING,
              RefundStatus.REQUIRES_REVIEW,
              RefundStatus.SUCCEEDED,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function cancelManualRefundCase(refundCaseId: string) {
  const result = await prisma.paymentRefund.updateMany({
    where: {
      id: refundCaseId,
      status: RefundStatus.REQUESTED,
      providerRefundId: null,
    },
    data: {
      status: RefundStatus.CANCELED,
      errorCode: "REFUND_CASE_CANCELED",
      errorMessage:
        "La preparación del reembolso fue cancelada por un administrador.",
      lastCheckedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new ManualRefundError(
      "REFUND_CASE_NOT_CANCELABLE",
      "El caso de reembolso ya no se puede cancelar.",
    );
  }
}

function refundVerificationIssues(
  refundCase: {
    providerMode: ProviderMode;
    expectedAmountMinor: number;
    currency: string;
    payment: { providerPaymentIntentId: string | null };
  },
  refund: OnvoRefund,
): string[] {
  const issues: string[] = [];
  if (refundCase.payment.providerPaymentIntentId !== refund.paymentIntentId) {
    issues.push("REFUND_PAYMENT_INTENT_MISMATCH");
  }
  if (refundCase.providerMode !== providerModeFromOnvo(refund.mode)) {
    issues.push("REFUND_PROVIDER_MODE_MISMATCH");
  }
  if (refundCase.currency !== refund.currency) {
    issues.push("REFUND_CURRENCY_MISMATCH");
  }
  if (refundCase.expectedAmountMinor !== refund.amount) {
    issues.push(
      refund.amount < refundCase.expectedAmountMinor
        ? "PARTIAL_REFUND_NOT_SUPPORTED"
        : "REFUND_AMOUNT_MISMATCH",
    );
  }
  return issues;
}

async function rebuildSubscriptionAfterRefund(
  tx: Prisma.TransactionClient,
  payment: {
    id: string;
    subscriptionId: string | null;
  },
  refundedAt: Date,
) {
  if (!payment.subscriptionId) return;

  const subscription = await tx.subscription.findUnique({
    where: { id: payment.subscriptionId },
  });
  if (!subscription) return;

  const remainingPayments = await tx.payment.findMany({
    where: {
      subscriptionId: payment.subscriptionId,
      id: { not: payment.id },
      status: PaymentStatus.SUCCEEDED,
      appliedAt: { not: null },
      confirmedAt: { not: null },
    },
    orderBy: [{ confirmedAt: "asc" }, { id: "asc" }],
  });

  let period: { currentPeriodStart: Date; currentPeriodEnd: Date } | null =
    null;
  for (const remainingPayment of remainingPayments) {
    period = resolveSubscriptionPeriod(
      period ? { ...period, status: SubscriptionStatus.ACTIVE } : null,
      remainingPayment.confirmedAt!,
      remainingPayment.durationMonths,
    );
  }

  await tx.subscription.update({
    where: { id: subscription.id },
    data: period
      ? {
          currentPeriodStart: period.currentPeriodStart,
          currentPeriodEnd: period.currentPeriodEnd,
          status:
            period.currentPeriodEnd > refundedAt
              ? SubscriptionStatus.ACTIVE
              : SubscriptionStatus.EXPIRED,
          lastPlanCode: remainingPayments.at(-1)?.planCode ?? null,
        }
      : {
          status: SubscriptionStatus.REFUNDED,
          currentPeriodStart:
            subscription.currentPeriodStart > refundedAt
              ? refundedAt
              : subscription.currentPeriodStart,
          currentPeriodEnd: refundedAt,
          lastPlanCode: null,
        },
  });
}

async function applySucceededRefund(
  refundCaseId: string,
  refund: OnvoRefund,
): Promise<OnvoRefundReconciliationResult> {
  const refundedAt = effectiveRefundDate(refund);

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const refundCase = await tx.paymentRefund.findUnique({
            where: { id: refundCaseId },
            include: { payment: true },
          });
          if (!refundCase) {
            throw new ManualRefundError(
              "REFUND_CASE_NOT_FOUND",
              "El caso de reembolso no existe.",
            );
          }

          if (refundCase.appliedAt) {
            return {
              paymentId: refundCase.paymentId,
              refundCaseId,
              outcome: "ALREADY_APPLIED" as const,
            };
          }

          if (
            refundCase.payment.status !== PaymentStatus.SUCCEEDED ||
            !refundCase.payment.appliedAt
          ) {
            await tx.paymentRefund.update({
              where: { id: refundCase.id },
              data: {
                status: RefundStatus.REQUIRES_REVIEW,
                errorCode: "PAYMENT_NOT_APPLIED_AT_REFUND",
                errorMessage:
                  "El pago local ya no se encuentra aplicado como exitoso.",
                lastCheckedAt: new Date(),
              },
            });
            return {
              paymentId: refundCase.paymentId,
              refundCaseId,
              outcome: "REQUIRES_REVIEW" as const,
            };
          }

          await tx.payment.update({
            where: { id: refundCase.paymentId },
            data: {
              status: PaymentStatus.REFUNDED,
              providerStatus: "refunded",
              errorCode: "PAYMENT_REFUNDED",
              errorMessage: "ONVO confirmó el reembolso total del pago.",
            },
          });
          await rebuildSubscriptionAfterRefund(
            tx,
            refundCase.payment,
            refundedAt,
          );
          await tx.paymentRefund.update({
            where: { id: refundCase.id },
            data: {
              providerRefundId: refund.id,
              status: RefundStatus.SUCCEEDED,
              providerStatus: refund.status,
              providerAmountMinor: refund.amount,
              reason: refund.reason ?? null,
              providerCreatedAt: parseProviderDate(refund.createdAt),
              providerUpdatedAt: parseProviderDate(refund.updatedAt),
              lastCheckedAt: new Date(),
              appliedAt: new Date(),
              errorCode: null,
              errorMessage: null,
            },
          });

          return {
            paymentId: refundCase.paymentId,
            refundCaseId,
            outcome: "SUCCEEDED" as const,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!isRetryableSerializableConflict(error)) throw error;

      const hasNextAttempt = attempt < MAX_SERIALIZABLE_ATTEMPTS;
      logOnvoPaymentEvent({
        event: hasNextAttempt
          ? "refund.transaction.conflict.retry"
          : "refund.transaction.conflict.exhausted",
        outcome: `attempt-${attempt}-of-${MAX_SERIALIZABLE_ATTEMPTS}`,
        refundId: refundCaseId,
      });
      if (!hasNextAttempt) throw error;

      await waitBeforeSerializableRetry(attempt);
    }
  }

  throw new Error("No fue posible aplicar el reembolso de forma serializable.");
}

async function reconcileRefundCaseWithProviderObject(
  refundCaseId: string,
  refund: OnvoRefund,
): Promise<OnvoRefundReconciliationResult> {
  const refundCase = await prisma.paymentRefund.findUnique({
    where: { id: refundCaseId },
    include: { payment: true },
  });
  if (!refundCase) {
    throw new ManualRefundError(
      "REFUND_CASE_NOT_FOUND",
      "El caso de reembolso no existe.",
    );
  }

  if (
    refundCase.providerRefundId &&
    refundCase.providerRefundId !== refund.id
  ) {
    throw new ManualRefundError(
      "REFUND_ID_CONFLICT",
      "El caso ya está asociado a otro reembolso de ONVO.",
    );
  }

  const issues = refundVerificationIssues(refundCase, refund);
  const providerSnapshot = {
    providerRefundId: refund.id,
    providerStatus: refund.status,
    providerAmountMinor: refund.amount,
    reason: refund.reason ?? null,
    providerCreatedAt: parseProviderDate(refund.createdAt),
    providerUpdatedAt: parseProviderDate(refund.updatedAt),
    lastCheckedAt: new Date(),
  };

  if (issues.length > 0) {
    const paymentIntentMismatch = issues.includes(
      "REFUND_PAYMENT_INTENT_MISMATCH",
    );
    await prisma.paymentRefund.update({
      where: { id: refundCase.id },
      data: {
        ...(paymentIntentMismatch
          ? { lastCheckedAt: new Date() }
          : providerSnapshot),
        status: RefundStatus.REQUIRES_REVIEW,
        errorCode: issues.join(","),
        errorMessage:
          "El reembolso de ONVO no coincide con el pago total esperado.",
      },
    });
    return {
      paymentId: refundCase.paymentId,
      refundCaseId,
      outcome: "REQUIRES_REVIEW",
    };
  }

  if (refund.status === "pending") {
    await prisma.paymentRefund.update({
      where: { id: refundCase.id },
      data: {
        ...providerSnapshot,
        status: RefundStatus.PENDING,
        errorCode: null,
        errorMessage: null,
      },
    });
    return {
      paymentId: refundCase.paymentId,
      refundCaseId,
      outcome: "PENDING",
    };
  }

  if (refund.status === "failed") {
    await prisma.paymentRefund.update({
      where: { id: refundCase.id },
      data: {
        ...providerSnapshot,
        status: RefundStatus.FAILED,
        errorCode: "ONVO_REFUND_FAILED",
        errorMessage:
          refund.failureReason ?? "ONVO informó que el reembolso falló.",
      },
    });
    return {
      paymentId: refundCase.paymentId,
      refundCaseId,
      outcome: "FAILED",
    };
  }

  return applySucceededRefund(refundCase.id, refund);
}

export async function registerManualOnvoRefund(input: {
  refundCaseId: string;
  providerRefundId: string;
}) {
  const existingOwner = await prisma.paymentRefund.findUnique({
    where: { providerRefundId: input.providerRefundId },
    select: { id: true },
  });
  if (existingOwner && existingOwner.id !== input.refundCaseId) {
    throw new ManualRefundError(
      "REFUND_ID_CONFLICT",
      "El refundId ya está asociado a otro caso.",
    );
  }
  const refund = await getOnvoRefund(input.providerRefundId);
  if (refund.id !== input.providerRefundId) {
    throw new ManualRefundError(
      "REFUND_PROVIDER_ID_MISMATCH",
      "ONVO devolvió un identificador distinto al consultado.",
    );
  }
  const result = await reconcileRefundCaseWithProviderObject(
    input.refundCaseId,
    refund,
  );
  logOnvoPaymentEvent({
    event: "refund.registered",
    outcome: result.outcome,
    paymentId: result.paymentId,
    refundId: refund.id,
  });
  return result;
}

export async function reconcileOnvoRefund(
  providerRefundId: string,
): Promise<OnvoRefundReconciliationResult> {
  const refundCase = await prisma.paymentRefund.findUnique({
    where: { providerRefundId },
  });
  if (!refundCase) {
    throw new ManualRefundError(
      "REFUND_NOT_REGISTERED",
      "El reembolso no está registrado en EduNivel.",
    );
  }

  const refund = await getOnvoRefund(providerRefundId);
  if (refund.id !== providerRefundId) {
    throw new ManualRefundError(
      "REFUND_PROVIDER_ID_MISMATCH",
      "ONVO devolvió un identificador distinto al consultado.",
    );
  }
  const result = await reconcileRefundCaseWithProviderObject(
    refundCase.id,
    refund,
  );
  logOnvoPaymentEvent({
    event: "refund.reconciled",
    outcome: result.outcome,
    paymentId: result.paymentId,
    refundId: refund.id,
  });
  return result;
}

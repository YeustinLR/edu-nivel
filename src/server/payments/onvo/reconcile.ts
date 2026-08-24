import "server-only";

import {
  BillingInterval,
  PaymentStatus,
  PlanCode,
  Prisma,
  ProviderMode,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/client";
import { getSubscriptionPlan } from "@/modules/subscriptions/config/plan-catalog";
import { resolveSubscriptionPeriod } from "@/modules/subscriptions/domain/subscription-period";
import { verifyOnvoPaymentIntent } from "@/modules/payments/domain/verify-onvo-payment";
import { prisma } from "@/server/db/prisma";
import { getOnvoPaymentIntent } from "@/server/payments/onvo/client";
import type { OnvoPaymentIntent } from "@/server/payments/onvo/schemas";
import { logOnvoPaymentEvent } from "@/server/payments/onvo/payment-log";
import { flagProviderRefundWithoutId } from "@/server/payments/onvo/refunds";
import {
  isRetryableSerializableConflict,
  MAX_SERIALIZABLE_ATTEMPTS,
  waitBeforeSerializableRetry,
} from "@/server/payments/onvo/serializable-transaction";

export type OnvoReconciliationOutcome =
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "REQUIRES_REVIEW"
  | "ALREADY_APPLIED";

export type OnvoReconciliationResult = {
  paymentId: string;
  outcome: OnvoReconciliationOutcome;
};

export class OnvoPaymentNotFoundError extends Error {
  constructor() {
    super("No existe un pago local para la intencion de ONVO.");
    this.name = "OnvoPaymentNotFoundError";
  }
}

class PaymentAlreadyAppliedError extends Error {}

function getConfirmedAt(intent: OnvoPaymentIntent): Date {
  if (intent.updatedAt) {
    const parsed = new Date(intent.updatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function getSuccessfulChargeId(intent: OnvoPaymentIntent): string | null {
  return (
    intent.charges?.find(
      (charge) => charge.status === "succeeded" || charge.isApproved,
    )?.id ?? null
  );
}

function hasValidPaymentSnapshot(
  payment: {
    planCode: PlanCode;
    product: SubscriptionProduct;
    billingInterval: BillingInterval;
    durationMonths: number;
    roleAtCheckout: Role;
  },
  currentUserRole: Role,
): boolean {
  const plan = getSubscriptionPlan(payment.planCode);

  return Boolean(
    plan &&
      plan.product === payment.product &&
      plan.billingInterval === payment.billingInterval &&
      plan.durationMonths === payment.durationMonths &&
      plan.requiredRole === payment.roleAtCheckout &&
      plan.requiredRole === currentUserRole,
  );
}

async function markForReview(
  paymentId: string,
  intent: OnvoPaymentIntent,
  errorCode: string,
): Promise<OnvoReconciliationResult> {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.REQUIRES_REVIEW,
      providerStatus: intent.status,
      receivedAmountMinor: intent.receivedAmount ?? null,
      confirmedAt:
        intent.status === "succeeded" ? getConfirmedAt(intent) : undefined,
      errorCode,
      errorMessage: "El pago requiere revision antes de aplicar el acceso.",
    },
  });

  return { paymentId, outcome: "REQUIRES_REVIEW" };
}

async function applySucceededPayment(
  paymentId: string,
  intent: OnvoPaymentIntent,
): Promise<OnvoReconciliationResult> {
  const confirmedAt = getConfirmedAt(intent);
  const providerChargeId = getSuccessfulChargeId(intent);

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { user: true, level: true },
          });

          if (!payment) {
            throw new OnvoPaymentNotFoundError();
          }

          if (payment.appliedAt) {
            return "ALREADY_APPLIED" as const;
          }

          if (!payment.level.isActive || !payment.level.requiresSubscription) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.REQUIRES_REVIEW,
                providerStatus: intent.status,
                receivedAmountMinor: intent.receivedAmount ?? null,
                confirmedAt,
                errorCode: "LEVEL_CHANGED_BEFORE_APPLICATION",
                errorMessage:
                  "El nivel cambio de disponibilidad antes de aplicar el pago.",
              },
            });
            return "REQUIRES_REVIEW" as const;
          }

          if (
            !payment.user.emailVerified ||
            !hasValidPaymentSnapshot(payment, payment.user.role)
          ) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.REQUIRES_REVIEW,
                providerStatus: intent.status,
                receivedAmountMinor: intent.receivedAmount ?? null,
                confirmedAt,
                errorCode: "PAYMENT_SNAPSHOT_OR_ROLE_MISMATCH",
                errorMessage:
                  "El pago fue confirmado, pero no coincide con el acceso solicitado.",
              },
            });
            return "REQUIRES_REVIEW" as const;
          }

          const currentSubscription = await tx.subscription.findUnique({
            where: {
              userId_levelId: {
                userId: payment.userId,
                levelId: payment.levelId,
              },
            },
          });
          const { currentPeriodStart, currentPeriodEnd } =
            resolveSubscriptionPeriod(
              currentSubscription,
              confirmedAt,
              payment.durationMonths,
            );

          const subscription = await tx.subscription.upsert({
            where: {
              userId_levelId: {
                userId: payment.userId,
                levelId: payment.levelId,
              },
            },
            create: {
              userId: payment.userId,
              levelId: payment.levelId,
              product: payment.product,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart,
              currentPeriodEnd,
              lastPlanCode: payment.planCode,
            },
            update: {
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart,
              currentPeriodEnd,
              lastPlanCode: payment.planCode,
            },
          });

          const applied = await tx.payment.updateMany({
            where: {
              id: payment.id,
              appliedAt: null,
            },
            data: {
              subscriptionId: subscription.id,
              status: PaymentStatus.SUCCEEDED,
              providerStatus: intent.status,
              receivedAmountMinor: intent.receivedAmount ?? null,
              providerChargeId,
              confirmedAt,
              appliedAt: new Date(),
              staleAt: null,
              errorCode: null,
              errorMessage: null,
            },
          });

          if (applied.count !== 1) {
            throw new PaymentAlreadyAppliedError();
          }

          return "SUCCEEDED" as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return { paymentId, outcome };
    } catch (error) {
      if (error instanceof PaymentAlreadyAppliedError) {
        return { paymentId, outcome: "ALREADY_APPLIED" };
      }

      if (!isRetryableSerializableConflict(error)) throw error;

      const hasNextAttempt = attempt < MAX_SERIALIZABLE_ATTEMPTS;
      logOnvoPaymentEvent({
        event: hasNextAttempt
          ? "transaction.conflict.retry"
          : "transaction.conflict.exhausted",
        outcome: `attempt-${attempt}-of-${MAX_SERIALIZABLE_ATTEMPTS}`,
        paymentId,
      });
      if (!hasNextAttempt) throw error;

      await waitBeforeSerializableRetry(attempt);
    }
  }

  throw new Error("No fue posible aplicar el pago de forma serializable.");
}

export async function reconcileOnvoPaymentIntent(
  providerPaymentIntentId: string,
): Promise<OnvoReconciliationResult> {
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentIntentId },
  });

  if (!payment) {
    throw new OnvoPaymentNotFoundError();
  }

  const intent = await getOnvoPaymentIntent(providerPaymentIntentId);
  logOnvoPaymentEvent({
    event: "intent.reconciled",
    outcome: intent.status,
    paymentId: payment.id,
    paymentIntentId: providerPaymentIntentId,
  });
  const verificationIssues = verifyOnvoPaymentIntent(payment, intent);

  if (verificationIssues.length > 0) {
    return markForReview(payment.id, intent, verificationIssues.join(","));
  }

  if (intent.status === "refunded") {
    await flagProviderRefundWithoutId({
      paymentId: payment.id,
      providerStatus: intent.status,
    });
    return { paymentId: payment.id, outcome: "REQUIRES_REVIEW" };
  }

  if (intent.status === "partially_refunded") {
    await flagProviderRefundWithoutId({
      paymentId: payment.id,
      providerStatus: intent.status,
    });
    return { paymentId: payment.id, outcome: "REQUIRES_REVIEW" };
  }

  if (payment.appliedAt) {
    return { paymentId: payment.id, outcome: "ALREADY_APPLIED" };
  }

  if (intent.status === "processing") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PROCESSING,
        providerStatus: intent.status,
        receivedAmountMinor: intent.receivedAmount ?? null,
      },
    });
    return { paymentId: payment.id, outcome: "PROCESSING" };
  }

  if (intent.status === "succeeded") {
    return applySucceededPayment(payment.id, intent);
  }

  if (intent.status === "canceled") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CANCELED,
        providerStatus: intent.status,
        staleAt: null,
      },
    });
    return { paymentId: payment.id, outcome: "CANCELED" };
  }

  if (intent.status === "requires_payment_method") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerStatus: intent.status,
        staleAt: null,
        errorCode: "PAYMENT_METHOD_REQUIRED",
        errorMessage: "ONVO requiere un nuevo metodo de pago.",
      },
    });
    return { paymentId: payment.id, outcome: "FAILED" };
  }

  if (intent.status === "failed") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerStatus: intent.status,
        staleAt: null,
        errorCode: "PAYMENT_FAILED",
        errorMessage: "ONVO confirmo que el pago fallo.",
      },
    });
    return { paymentId: payment.id, outcome: "FAILED" };
  }

  return markForReview(payment.id, intent, "UNEXPECTED_PROVIDER_STATUS");
}

export function providerModeFromEnvironment(
  mode: "test" | "live",
): ProviderMode {
  return mode === "test" ? ProviderMode.TEST : ProviderMode.LIVE;
}

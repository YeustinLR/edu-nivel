import "server-only";

import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
} from "@/generated/prisma/client";
import {
  SINPE_RECONCILIATION_MIN_AGE_MS,
  SINPE_STALE_AFTER_MS,
} from "@/modules/payments/domain/sinpe-payment-lifecycle";
import { prisma } from "@/server/db/prisma";
import { reconcileOnvoPaymentIntent } from "@/server/payments/onvo/reconcile";
import { recoverOnvoPaymentIntent } from "@/server/payments/onvo/recover-payment-intent";
import { logOnvoPaymentEvent } from "@/server/payments/onvo/payment-log";
import { reconcileOnvoRefund } from "@/server/payments/onvo/refunds";

const RECONCILIATION_BATCH_SIZE = 20;

export type PendingReconciliationSummary = {
  selected: number;
  succeeded: number;
  processing: number;
  terminal: number;
  review: number;
  alreadyApplied: number;
  failed: number;
  orphanSelected: number;
  recovered: number;
  abandoned: number;
  refundSelected: number;
  refundSucceeded: number;
  refundPending: number;
  refundReview: number;
  refundAlreadyApplied: number;
  refundFailed: number;
};

export async function reconcilePendingOnvoPayments(
  now = new Date(),
): Promise<PendingReconciliationSummary> {
  const retryBefore = new Date(
    now.getTime() - SINPE_RECONCILIATION_MIN_AGE_MS,
  );
  const staleBefore = new Date(now.getTime() - SINPE_STALE_AFTER_MS);
  const orphanPayments = await prisma.payment.findMany({
    where: {
      provider: PaymentProvider.ONVO,
      method: PaymentMethod.SINPE_MOBILE,
      status: {
        in: [PaymentStatus.INITIALIZING, PaymentStatus.REQUIRES_REVIEW],
      },
      providerPaymentIntentId: null,
      appliedAt: null,
      updatedAt: { lte: retryBefore },
    },
    orderBy: { updatedAt: "asc" },
    take: RECONCILIATION_BATCH_SIZE,
  });
  const remainingBatchSize = RECONCILIATION_BATCH_SIZE - orphanPayments.length;
  const payments =
    remainingBatchSize > 0
      ? await prisma.payment.findMany({
          where: {
            provider: PaymentProvider.ONVO,
            method: PaymentMethod.SINPE_MOBILE,
            status: {
              in: [PaymentStatus.INITIALIZING, PaymentStatus.PROCESSING],
            },
            providerPaymentIntentId: { not: null },
            updatedAt: { lte: retryBefore },
          },
          orderBy: { updatedAt: "asc" },
          take: remainingBatchSize,
        })
      : [];
  const summary: PendingReconciliationSummary = {
    selected: orphanPayments.length + payments.length,
    succeeded: 0,
    processing: 0,
    terminal: 0,
    review: 0,
    alreadyApplied: 0,
    failed: 0,
    orphanSelected: orphanPayments.length,
    recovered: 0,
    abandoned: 0,
    refundSelected: 0,
    refundSucceeded: 0,
    refundPending: 0,
    refundReview: 0,
    refundAlreadyApplied: 0,
    refundFailed: 0,
  };

  for (const payment of orphanPayments) {
    try {
      const outcome = await recoverOnvoPaymentIntent(payment.id, now);
      if (outcome === "RECOVERED") summary.recovered += 1;
      else if (outcome === "ABANDONED") summary.abandoned += 1;
      else if (outcome === "REQUIRES_REVIEW") summary.review += 1;
    } catch {
      summary.failed += 1;
      logOnvoPaymentEvent({
        event: "intent.recovery.failed",
        outcome: "error",
        paymentId: payment.id,
      });
    }
  }

  for (const payment of payments) {
    try {
      const result = await reconcileOnvoPaymentIntent(
        payment.providerPaymentIntentId!,
      );

      if (result.outcome === "PROCESSING") {
        summary.processing += 1;

        if (!payment.staleAt && payment.createdAt <= staleBefore) {
          await prisma.payment.updateMany({
            where: {
              id: payment.id,
              staleAt: null,
              status: {
                in: [PaymentStatus.INITIALIZING, PaymentStatus.PROCESSING],
              },
            },
            data: { staleAt: now },
          });
        }
      } else if (result.outcome === "SUCCEEDED") {
        summary.succeeded += 1;
      } else if (result.outcome === "ALREADY_APPLIED") {
        summary.alreadyApplied += 1;
      } else if (result.outcome === "REQUIRES_REVIEW") {
        summary.review += 1;
      } else {
        summary.terminal += 1;
      }
    } catch {
      summary.failed += 1;
      logOnvoPaymentEvent({
        event: "intent.reconciliation.failed",
        outcome: "error",
        paymentId: payment.id,
        paymentIntentId: payment.providerPaymentIntentId,
      });
    }
  }

  const refunds = await prisma.paymentRefund.findMany({
    where: {
      provider: PaymentProvider.ONVO,
      status: RefundStatus.PENDING,
      providerRefundId: { not: null },
      updatedAt: { lte: retryBefore },
    },
    orderBy: { updatedAt: "asc" },
    take: RECONCILIATION_BATCH_SIZE,
  });
  summary.refundSelected = refunds.length;

  for (const refund of refunds) {
    try {
      const result = await reconcileOnvoRefund(refund.providerRefundId!);
      if (result.outcome === "SUCCEEDED") summary.refundSucceeded += 1;
      else if (result.outcome === "PENDING") summary.refundPending += 1;
      else if (result.outcome === "REQUIRES_REVIEW") summary.refundReview += 1;
      else if (result.outcome === "ALREADY_APPLIED") {
        summary.refundAlreadyApplied += 1;
      } else summary.refundFailed += 1;
    } catch {
      summary.refundFailed += 1;
      logOnvoPaymentEvent({
        event: "refund.reconciliation.failed",
        outcome: "error",
        paymentId: refund.paymentId,
        refundId: refund.providerRefundId,
      });
    }
  }

  return summary;
}

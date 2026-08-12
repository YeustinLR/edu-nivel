import "server-only";

import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from "@/generated/prisma/client";
import {
  SINPE_RECONCILIATION_MIN_AGE_MS,
  SINPE_STALE_AFTER_MS,
} from "@/modules/payments/domain/sinpe-payment-lifecycle";
import { prisma } from "@/server/db/prisma";
import { reconcileOnvoPaymentIntent } from "@/server/payments/onvo/reconcile";

const RECONCILIATION_BATCH_SIZE = 20;

export type PendingReconciliationSummary = {
  selected: number;
  succeeded: number;
  processing: number;
  terminal: number;
  review: number;
  alreadyApplied: number;
  failed: number;
};

export async function reconcilePendingOnvoPayments(
  now = new Date(),
): Promise<PendingReconciliationSummary> {
  const retryBefore = new Date(
    now.getTime() - SINPE_RECONCILIATION_MIN_AGE_MS,
  );
  const staleBefore = new Date(now.getTime() - SINPE_STALE_AFTER_MS);
  const payments = await prisma.payment.findMany({
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
    take: RECONCILIATION_BATCH_SIZE,
  });
  const summary: PendingReconciliationSummary = {
    selected: payments.length,
    succeeded: 0,
    processing: 0,
    terminal: 0,
    review: 0,
    alreadyApplied: 0,
    failed: 0,
  };

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
    }
  }

  return summary;
}

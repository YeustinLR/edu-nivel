import "server-only";

import { PaymentStatus, ProviderMode } from "@/generated/prisma/client";
import { SINPE_STALE_AFTER_MS } from "@/modules/payments/domain/sinpe-payment-lifecycle";
import { prisma } from "@/server/db/prisma";
import {
  getOnvoPaymentIntent,
  listOnvoPaymentIntents,
} from "@/server/payments/onvo/client";
import { reconcileOnvoPaymentIntent } from "@/server/payments/onvo/reconcile";
import type { OnvoPaymentIntent } from "@/server/payments/onvo/schemas";

const SEARCH_CLOCK_SKEW_MS = 60_000;
const MAX_SEARCH_PAGES = 10;

export type OrphanRecoveryOutcome =
  | "RECOVERED"
  | "NOT_DUE"
  | "NOT_FOUND"
  | "ABANDONED"
  | "REQUIRES_REVIEW";

function metadataMatches(
  intent: OnvoPaymentIntent,
  payment: {
    id: string;
    internalReference: string;
    userId: string;
    levelId: string;
    planCode: string;
  },
) {
  return (
    intent.metadata?.paymentId === payment.id &&
    intent.metadata?.internalReference === payment.internalReference &&
    intent.metadata?.userId === payment.userId &&
    intent.metadata?.levelId === payment.levelId &&
    intent.metadata?.planCode === payment.planCode
  );
}

export async function recoverOnvoPaymentIntent(
  paymentId: string,
  now = new Date(),
): Promise<OrphanRecoveryOutcome> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

  if (!payment || payment.providerPaymentIntentId || payment.appliedAt) {
    return "NOT_DUE";
  }

  const matches: OnvoPaymentIntent[] = [];
  let cursor: string | undefined;
  let exhausted = false;

  for (let page = 0; page < MAX_SEARCH_PAGES; page += 1) {
    const result = await listOnvoPaymentIntents({
      createdAtGte: new Date(payment.createdAt.getTime() - SEARCH_CLOCK_SKEW_MS),
      createdAtLte: new Date(now.getTime() + SEARCH_CLOCK_SKEW_MS),
      startingAfter: cursor,
    });
    matches.push(
      ...result.data.filter((intent) => metadataMatches(intent, payment)),
    );

    cursor = result.meta?.cursorNext ?? undefined;
    if (!cursor) {
      exhausted = true;
      break;
    }
  }

  if (matches.length > 1 || !exhausted) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REQUIRES_REVIEW,
        errorCode: matches.length > 1
          ? "MULTIPLE_ONVO_INTENTS_FOUND"
          : "ONVO_INTENT_SEARCH_INCOMPLETE",
        errorMessage: "No fue posible recuperar el intento de forma inequivoca.",
      },
    });
    return "REQUIRES_REVIEW";
  }

  const intent = matches[0];
  if (!intent) {
    if (now.getTime() - payment.createdAt.getTime() < SINPE_STALE_AFTER_MS) {
      return "NOT_FOUND";
    }

    await prisma.payment.updateMany({
      where: {
        id: payment.id,
        providerPaymentIntentId: null,
        appliedAt: null,
        status: {
          in: [PaymentStatus.INITIALIZING, PaymentStatus.REQUIRES_REVIEW],
        },
      },
      data: {
        status: PaymentStatus.FAILED,
        staleAt: null,
        errorCode: "ONVO_INTENT_NOT_CREATED",
        errorMessage:
          "ONVO no contiene una intencion asociada; el intento puede repetirse.",
      },
    });
    return "ABANDONED";
  }

  const expectedMode =
    payment.providerMode === ProviderMode.TEST ? "test" : "live";
  if (
    intent.mode !== expectedMode ||
    intent.amount !== payment.expectedAmountMinor ||
    intent.currency !== payment.currency
  ) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REQUIRES_REVIEW,
        providerStatus: intent.status,
        errorCode: "RECOVERED_INTENT_SNAPSHOT_MISMATCH",
        errorMessage: "El intento recuperado no coincide con el pago local.",
      },
    });
    return "REQUIRES_REVIEW";
  }

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, providerPaymentIntentId: null, appliedAt: null },
    data: {
      providerPaymentIntentId: intent.id,
      providerPaymentMethodId:
        intent.paymentMethodId ?? intent.paymentMethod?.id ?? null,
      providerStatus: intent.status,
      receivedAmountMinor: intent.receivedAmount ?? null,
      errorCode: null,
      errorMessage: null,
    },
  });
  if (claimed.count !== 1) return "NOT_DUE";

  await reconcileOnvoPaymentIntent(intent.id);
  return "RECOVERED";
}

export async function recoverOnvoPaymentIntentByProviderId(
  providerPaymentIntentId: string,
): Promise<OrphanRecoveryOutcome> {
  const intent = await getOnvoPaymentIntent(providerPaymentIntentId);
  const paymentId = intent.metadata?.paymentId;
  if (typeof paymentId !== "string" || !paymentId) return "NOT_FOUND";

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return "NOT_FOUND";
  if (payment.providerPaymentIntentId === intent.id) {
    await reconcileOnvoPaymentIntent(intent.id);
    return "RECOVERED";
  }
  if (payment.providerPaymentIntentId || payment.appliedAt) {
    return "REQUIRES_REVIEW";
  }

  const expectedMode =
    payment.providerMode === ProviderMode.TEST ? "test" : "live";
  if (
    !metadataMatches(intent, payment) ||
    intent.mode !== expectedMode ||
    intent.amount !== payment.expectedAmountMinor ||
    intent.currency !== payment.currency
  ) {
    return "REQUIRES_REVIEW";
  }

  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, providerPaymentIntentId: null, appliedAt: null },
    data: {
      providerPaymentIntentId: intent.id,
      providerPaymentMethodId:
        intent.paymentMethodId ?? intent.paymentMethod?.id ?? null,
      providerStatus: intent.status,
      receivedAmountMinor: intent.receivedAmount ?? null,
      errorCode: null,
      errorMessage: null,
    },
  });
  if (claimed.count !== 1) return "REQUIRES_REVIEW";

  await reconcileOnvoPaymentIntent(intent.id);
  return "RECOVERED";
}

import "server-only";

import { WebhookOutcome } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

const WEBHOOK_PROCESSING_LEASE_MS = 5 * 60 * 1_000;
const MAX_CLAIM_ATTEMPTS = 3;

type WebhookReceiptInput = {
  eventType: string;
  providerObjectId: string;
  payloadHash: string;
  deduplicationKey: string;
};

export type WebhookReceiptClaim = {
  receiptId: string;
  processingStartedAt: Date;
};

export type WebhookReceiptClaimResult =
  | { status: "CLAIMED"; claim: WebhookReceiptClaim }
  | {
      status: "DUPLICATE";
      outcome: Exclude<WebhookOutcome, "PROCESSING" | "FAILED">;
    }
  | { status: "PROCESSING" };

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function isTerminalOutcome(
  outcome: WebhookOutcome,
): outcome is Exclude<WebhookOutcome, "PROCESSING" | "FAILED"> {
  return (
    outcome === WebhookOutcome.PROCESSED ||
    outcome === WebhookOutcome.IGNORED ||
    outcome === WebhookOutcome.REQUIRES_REVIEW
  );
}

async function tryCreateClaim(
  input: WebhookReceiptInput,
  processingStartedAt: Date,
): Promise<WebhookReceiptClaim | null> {
  try {
    const receipt = await prisma.webhookReceipt.create({
      data: {
        eventType: input.eventType,
        providerObjectId: input.providerObjectId,
        payloadHash: input.payloadHash,
        deduplicationKey: input.deduplicationKey,
        outcome: WebhookOutcome.PROCESSING,
        processingStartedAt,
        processedAt: null,
        errorCode: null,
      },
      select: { id: true },
    });

    return { receiptId: receipt.id, processingStartedAt };
  } catch (error) {
    if (isUniqueConstraintError(error)) return null;
    throw error;
  }
}

export async function claimWebhookReceipt(
  input: WebhookReceiptInput,
  now = new Date(),
): Promise<WebhookReceiptClaimResult> {
  const initialClaim = await tryCreateClaim(input, now);
  if (initialClaim) return { status: "CLAIMED", claim: initialClaim };

  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt += 1) {
    const processingStartedAt = new Date(now.getTime() + attempt);
    const staleBefore = new Date(
      processingStartedAt.getTime() - WEBHOOK_PROCESSING_LEASE_MS,
    );
    const claimed = await prisma.webhookReceipt.updateMany({
      where: {
        deduplicationKey: input.deduplicationKey,
        OR: [
          { outcome: WebhookOutcome.FAILED },
          {
            outcome: WebhookOutcome.REQUIRES_REVIEW,
            errorCode: "LOCAL_PAYMENT_NOT_FOUND",
          },
          {
            outcome: WebhookOutcome.PROCESSING,
            OR: [
              { processingStartedAt: null },
              { processingStartedAt: { lte: staleBefore } },
            ],
          },
        ],
      },
      data: {
        outcome: WebhookOutcome.PROCESSING,
        processingStartedAt,
        processedAt: null,
        errorCode: null,
      },
    });

    if (claimed.count === 1) {
      const receipt = await prisma.webhookReceipt.findUniqueOrThrow({
        where: { deduplicationKey: input.deduplicationKey },
        select: { id: true },
      });
      return {
        status: "CLAIMED",
        claim: { receiptId: receipt.id, processingStartedAt },
      };
    }

    const existing = await prisma.webhookReceipt.findUnique({
      where: { deduplicationKey: input.deduplicationKey },
      select: { outcome: true },
    });
    if (!existing) {
      const recreated = await tryCreateClaim(input, processingStartedAt);
      if (recreated) return { status: "CLAIMED", claim: recreated };
      continue;
    }
    if (isTerminalOutcome(existing.outcome)) {
      return {
        status: "DUPLICATE",
        outcome: existing.outcome,
      };
    }
    if (existing.outcome === WebhookOutcome.PROCESSING) {
      return { status: "PROCESSING" };
    }
  }

  return { status: "PROCESSING" };
}

export async function finalizeWebhookReceipt(
  claim: WebhookReceiptClaim,
  input: {
    outcome: Exclude<WebhookOutcome, "PROCESSING">;
    errorCode?: string;
  },
  now = new Date(),
): Promise<boolean> {
  const finalized = await prisma.webhookReceipt.updateMany({
    where: {
      id: claim.receiptId,
      outcome: WebhookOutcome.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      outcome: input.outcome,
      processingStartedAt: null,
      processedAt: now,
      errorCode: input.errorCode ?? null,
    },
  });

  return finalized.count === 1;
}

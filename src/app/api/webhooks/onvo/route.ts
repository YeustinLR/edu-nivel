import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/config/env";
import { WebhookOutcome } from "@/generated/prisma/client";
import { revalidatePaymentAccessPages } from "@/server/content/revalidate-content";
import { prisma } from "@/server/db/prisma";
import { logOnvoPaymentEvent } from "@/server/payments/onvo/payment-log";
import {
  OnvoPaymentNotFoundError,
  reconcileOnvoPaymentIntent,
} from "@/server/payments/onvo/reconcile";
import { recoverOnvoPaymentIntentByProviderId } from "@/server/payments/onvo/recover-payment-intent";
import {
  claimWebhookReceipt,
  finalizeWebhookReceipt,
  type WebhookReceiptClaim,
} from "@/server/payments/onvo/webhook-receipts";

export const runtime = "nodejs";

const onvoWebhookSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

const reconciledEventTypes = new Set([
  "payment-intent.succeeded",
  "payment-intent.failed",
  "payment-intent.deferred",
]);

function secretsMatch(received: string | null, expected: string): boolean {
  const receivedDigest = createHash("sha256")
    .update(received ?? "")
    .digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  return timingSafeEqual(receivedDigest, expectedDigest);
}

async function recordReceipt(input: {
  eventType: string;
  providerObjectId: string | null;
  payloadHash: string;
  deduplicationKey: string;
  outcome: WebhookOutcome;
  errorCode?: string;
}) {
  try {
    await prisma.webhookReceipt.create({
      data: {
        eventType: input.eventType,
        providerObjectId: input.providerObjectId,
        payloadHash: input.payloadHash,
        deduplicationKey: input.deduplicationKey,
        outcome: input.outcome,
        errorCode: input.errorCode,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

async function finalizeClaim(
  claim: WebhookReceiptClaim,
  input: {
    outcome: Exclude<WebhookOutcome, "PROCESSING">;
    errorCode?: string;
  },
) {
  const finalized = await finalizeWebhookReceipt(claim, input);
  if (!finalized) {
    throw new Error("El claim del webhook ya no pertenece a este request.");
  }
}

export async function POST(request: Request) {
  if (!env.ONVO_WEBHOOK_SECRET) {
    return NextResponse.json(
      { received: false, code: "WEBHOOK_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (
    !secretsMatch(
      request.headers.get("x-webhook-secret"),
      env.ONVO_WEBHOOK_SECRET,
    )
  ) {
    return NextResponse.json(
      { received: false, code: "INVALID_WEBHOOK_SECRET" },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  let json: unknown;

  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { received: false, code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = onvoWebhookSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { received: false, code: "INVALID_PAYLOAD" },
      { status: 400 },
    );
  }

  const { type, data } = parsed.data;
  const providerObjectId =
    typeof data.id === "string" && data.id.length > 0 ? data.id : null;
  const deduplicationKey = createHash("sha256")
    .update(`${type}:${providerObjectId ?? "none"}:${payloadHash}`)
    .digest("hex");
  logOnvoPaymentEvent({
    event: "webhook.received",
    outcome: reconciledEventTypes.has(type) ? "accepted-type" : "ignored-type",
    paymentIntentId: providerObjectId,
    webhookEvent: type,
  });

  if (!reconciledEventTypes.has(type)) {
    await recordReceipt({
      eventType: type,
      providerObjectId,
      payloadHash,
      deduplicationKey,
      outcome: WebhookOutcome.IGNORED,
    });

    return NextResponse.json({ received: true, ignored: true });
  }

  if (!providerObjectId) {
    await recordReceipt({
      eventType: type,
      providerObjectId: null,
      payloadHash,
      deduplicationKey,
      outcome: WebhookOutcome.REQUIRES_REVIEW,
      errorCode: "PAYMENT_INTENT_ID_MISSING",
    });
    return NextResponse.json(
      { received: false, code: "PAYMENT_INTENT_ID_MISSING" },
      { status: 400 },
    );
  }

  let claimResult;
  try {
    claimResult = await claimWebhookReceipt({
      eventType: type,
      providerObjectId,
      payloadHash,
      deduplicationKey,
    });
  } catch {
    return NextResponse.json(
      { received: false, code: "WEBHOOK_RECEIPT_CLAIM_FAILED" },
      { status: 500 },
    );
  }

  if (claimResult.status === "DUPLICATE") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (claimResult.status === "PROCESSING") {
    return NextResponse.json(
      { received: false, code: "WEBHOOK_ALREADY_PROCESSING" },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  }

  const { claim } = claimResult;

  try {
    let result: Awaited<ReturnType<typeof reconcileOnvoPaymentIntent>>;
    try {
      result = await reconcileOnvoPaymentIntent(providerObjectId);
    } catch (error) {
      if (!(error instanceof OnvoPaymentNotFoundError)) throw error;

      const recovery = await recoverOnvoPaymentIntentByProviderId(
        providerObjectId,
      );
      if (recovery === "RECOVERED") {
        await finalizeClaim(claim, { outcome: WebhookOutcome.PROCESSED });
        revalidatePaymentAccessPages();
        return NextResponse.json({ received: true, recovered: true });
      }

      await finalizeClaim(claim, {
        outcome: WebhookOutcome.FAILED,
        errorCode: "LOCAL_PAYMENT_NOT_FOUND",
      });
      return NextResponse.json(
        { received: false, review: true },
        { status: 500 },
      );
    }

    await finalizeClaim(claim, {
      outcome:
        result.outcome === "REQUIRES_REVIEW"
          ? WebhookOutcome.REQUIRES_REVIEW
          : WebhookOutcome.PROCESSED,
      errorCode:
        result.outcome === "REQUIRES_REVIEW"
          ? "PAYMENT_REQUIRES_REVIEW"
          : undefined,
    });

    if (
      result.outcome === "SUCCEEDED" ||
      result.outcome === "ALREADY_APPLIED"
    ) {
      revalidatePaymentAccessPages();
    }

    return NextResponse.json({ received: true });
  } catch {
    try {
      await finalizeWebhookReceipt(claim, {
        outcome: WebhookOutcome.FAILED,
        errorCode: "TEMPORARY_PROCESSING_FAILURE",
      });
    } catch {
      // Si PostgreSQL no responde, tampoco es posible auditar la entrega.
    }

    return NextResponse.json(
      { received: false, code: "TEMPORARY_PROCESSING_FAILURE" },
      { status: 500 },
    );
  }
}

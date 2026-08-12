import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/config/env";
import { WebhookOutcome } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  OnvoPaymentNotFoundError,
  reconcileOnvoPaymentIntent,
} from "@/server/payments/onvo/reconcile";

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
  outcome: WebhookOutcome;
  errorCode?: string;
}) {
  await prisma.webhookReceipt.create({
    data: {
      eventType: input.eventType,
      providerObjectId: input.providerObjectId,
      payloadHash: input.payloadHash,
      outcome: input.outcome,
      errorCode: input.errorCode,
      processedAt: new Date(),
    },
  });
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

  if (!reconciledEventTypes.has(type)) {
    await recordReceipt({
      eventType: type,
      providerObjectId,
      payloadHash,
      outcome: WebhookOutcome.IGNORED,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  if (!providerObjectId) {
    await recordReceipt({
      eventType: type,
      providerObjectId: null,
      payloadHash,
      outcome: WebhookOutcome.REQUIRES_REVIEW,
      errorCode: "PAYMENT_INTENT_ID_MISSING",
    });
    return NextResponse.json(
      { received: false, code: "PAYMENT_INTENT_ID_MISSING" },
      { status: 400 },
    );
  }

  try {
    const result = await reconcileOnvoPaymentIntent(providerObjectId);
    await recordReceipt({
      eventType: type,
      providerObjectId,
      payloadHash,
      outcome:
        result.outcome === "REQUIRES_REVIEW"
          ? WebhookOutcome.REQUIRES_REVIEW
          : WebhookOutcome.PROCESSED,
      errorCode:
        result.outcome === "REQUIRES_REVIEW"
          ? "PAYMENT_REQUIRES_REVIEW"
          : undefined,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof OnvoPaymentNotFoundError) {
      await recordReceipt({
        eventType: type,
        providerObjectId,
        payloadHash,
        outcome: WebhookOutcome.REQUIRES_REVIEW,
        errorCode: "LOCAL_PAYMENT_NOT_FOUND",
      });
      return NextResponse.json({ received: true, review: true });
    }

    try {
      await recordReceipt({
        eventType: type,
        providerObjectId,
        payloadHash,
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

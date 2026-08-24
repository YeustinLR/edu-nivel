import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookOutcome } from "@/generated/prisma/client";

const {
  mockEnv,
  receiptCreateMock,
  claimReceiptMock,
  finalizeReceiptMock,
  reconcileMock,
  recoverMock,
  MockOnvoPaymentNotFoundError,
} = vi.hoisted(() => {
  class OnvoPaymentNotFoundError extends Error {}

  return {
    mockEnv: {
      ONVO_WEBHOOK_SECRET: "webhook_secret_test",
    } as { ONVO_WEBHOOK_SECRET?: string },
    receiptCreateMock: vi.fn(),
    claimReceiptMock: vi.fn(),
    finalizeReceiptMock: vi.fn(),
    reconcileMock: vi.fn(),
    recoverMock: vi.fn(),
    MockOnvoPaymentNotFoundError: OnvoPaymentNotFoundError,
  };
});

vi.mock("@/config/env", () => ({ env: mockEnv }));
vi.mock("@/server/db/prisma", () => ({
  prisma: { webhookReceipt: { create: receiptCreateMock } },
}));
vi.mock("@/server/payments/onvo/reconcile", () => ({
  OnvoPaymentNotFoundError: MockOnvoPaymentNotFoundError,
  reconcileOnvoPaymentIntent: reconcileMock,
}));
vi.mock("@/server/payments/onvo/recover-payment-intent", () => ({
  recoverOnvoPaymentIntentByProviderId: recoverMock,
}));
vi.mock("@/server/payments/onvo/payment-log", () => ({
  logOnvoPaymentEvent: vi.fn(),
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidatePaymentAccessPages: vi.fn(),
}));
vi.mock("@/server/payments/onvo/webhook-receipts", () => ({
  claimWebhookReceipt: claimReceiptMock,
  finalizeWebhookReceipt: finalizeReceiptMock,
}));

import { POST } from "@/app/api/webhooks/onvo/route";

const webhookUrl = "http://localhost:3000/api/webhooks/onvo";

function webhookRequest(
  body: string | object,
  secret: string | null = "webhook_secret_test",
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (secret !== null) headers.set("x-webhook-secret", secret);

  return new Request(webhookUrl, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function claimed(receiptId = "receipt_1", millisecond = 0) {
  return {
    status: "CLAIMED",
    claim: {
      receiptId,
      processingStartedAt: new Date(
        `2026-08-22T12:00:00.${String(millisecond).padStart(3, "0")}Z`,
      ),
    },
  };
}

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/webhooks/onvo", () => {
  beforeEach(() => {
    mockEnv.ONVO_WEBHOOK_SECRET = "webhook_secret_test";
    receiptCreateMock.mockReset().mockResolvedValue({ id: "receipt_1" });
    claimReceiptMock.mockReset().mockResolvedValue(claimed());
    finalizeReceiptMock.mockReset().mockResolvedValue(true);
    reconcileMock.mockReset().mockResolvedValue({
      paymentId: "payment_1",
      outcome: "SUCCEEDED",
    });
    recoverMock.mockReset().mockResolvedValue("NOT_FOUND");
  });

  it("returns 503 when the webhook secret is not configured", async () => {
    mockEnv.ONVO_WEBHOOK_SECRET = undefined;
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_1" },
      }),
    );

    expect(response.status).toBe(503);
    expect(await responseBody(response)).toEqual({
      received: false,
      code: "WEBHOOK_NOT_CONFIGURED",
    });
    expect(claimReceiptMock).not.toHaveBeenCalled();
  });

  it("returns 401 for a missing or incorrect secret", async () => {
    for (const secret of [null, "webhook_secret_wrong"]) {
      const response = await POST(
        webhookRequest(
          {
            type: "payment-intent.succeeded",
            data: { id: "intent_1" },
          },
          secret,
        ),
      );
      expect(response.status).toBe(401);
    }

    expect(reconcileMock).not.toHaveBeenCalled();
    expect(claimReceiptMock).not.toHaveBeenCalled();
    expect(receiptCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 without persisting invalid input", async () => {
    const invalidJson = await POST(webhookRequest("not-json"));
    const invalidEnvelope = await POST(
      webhookRequest({ type: "payment-intent.succeeded" }),
    );

    expect(invalidJson.status).toBe(400);
    expect(invalidEnvelope.status).toBe(400);
    expect(claimReceiptMock).not.toHaveBeenCalled();
    expect(receiptCreateMock).not.toHaveBeenCalled();
  });

  it("ignores unsupported events without starting a processing claim", async () => {
    const response = await POST(
      webhookRequest({
        type: "mobile-transfer.received",
        data: { amount: 350_000, currency: "CRC" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({
      received: true,
      ignored: true,
    });
    expect(claimReceiptMock).not.toHaveBeenCalled();
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outcome: WebhookOutcome.IGNORED,
        providerObjectId: null,
      }),
    });
  });

  it("rejects a PaymentIntent event without its provider id", async () => {
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { status: "succeeded" },
      }),
    );

    expect(response.status).toBe(400);
    expect(claimReceiptMock).not.toHaveBeenCalled();
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outcome: WebhookOutcome.REQUIRES_REVIEW,
        errorCode: "PAYMENT_INTENT_ID_MISSING",
      }),
    });
  });

  it.each([
    "payment-intent.succeeded",
    "payment-intent.failed",
    "payment-intent.deferred",
  ])("claims and reconciles the supported event %s", async (eventType) => {
    const response = await POST(
      webhookRequest({
        type: eventType,
        data: { id: "intent_1", customer: { email: "private@example.com" } },
      }),
    );

    expect(response.status).toBe(200);
    expect(reconcileMock).toHaveBeenCalledWith("intent_1");
    expect(claimReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType,
        providerObjectId: "intent_1",
        payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        deduplicationKey: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(finalizeReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ receiptId: "receipt_1" }),
      { outcome: WebhookOutcome.PROCESSED },
    );
    expect(receiptCreateMock).not.toHaveBeenCalled();
  });

  it("records an authoritative result that requires review as terminal", async () => {
    reconcileMock.mockResolvedValue({
      paymentId: "payment_1",
      outcome: "REQUIRES_REVIEW",
    });
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_1" },
      }),
    );

    expect(response.status).toBe(200);
    expect(finalizeReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ receiptId: "receipt_1" }),
      {
        outcome: WebhookOutcome.REQUIRES_REVIEW,
        errorCode: "PAYMENT_REQUIRES_REVIEW",
      },
    );
  });

  it("does not trust a successful event name over ONVO's result", async () => {
    reconcileMock.mockResolvedValue({
      paymentId: "payment_1",
      outcome: "FAILED",
    });
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_1", status: "succeeded" },
      }),
    );

    expect(response.status).toBe(200);
    expect(reconcileMock).toHaveBeenCalledWith("intent_1");
    expect(finalizeReceiptMock).toHaveBeenCalledWith(
      expect.anything(),
      { outcome: WebhookOutcome.PROCESSED },
    );
  });

  it("acknowledges a terminal duplicate without reconciling again", async () => {
    claimReceiptMock.mockResolvedValue({
      status: "DUPLICATE",
      outcome: WebhookOutcome.PROCESSED,
    });
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_1" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({
      received: true,
      duplicate: true,
    });
    expect(reconcileMock).not.toHaveBeenCalled();
    expect(finalizeReceiptMock).not.toHaveBeenCalled();
  });

  it("returns 503 when another request owns the processing claim", async () => {
    claimReceiptMock.mockResolvedValue({ status: "PROCESSING" });
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_1" },
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await responseBody(response)).toEqual({
      received: false,
      code: "WEBHOOK_ALREADY_PROCESSING",
    });
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("returns 500 when PostgreSQL cannot establish the claim", async () => {
    claimReceiptMock.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_1" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await responseBody(response)).toEqual({
      received: false,
      code: "WEBHOOK_RECEIPT_CLAIM_FAILED",
    });
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("marks an unknown local PaymentIntent as retryable", async () => {
    reconcileMock.mockRejectedValue(new MockOnvoPaymentNotFoundError());
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_unknown" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await responseBody(response)).toEqual({
      received: false,
      review: true,
    });
    expect(finalizeReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ receiptId: "receipt_1" }),
      {
        outcome: WebhookOutcome.FAILED,
        errorCode: "LOCAL_PAYMENT_NOT_FOUND",
      },
    );
  });

  it("recovers an orphaned local payment before acknowledging", async () => {
    reconcileMock.mockRejectedValue(new MockOnvoPaymentNotFoundError());
    recoverMock.mockResolvedValue("RECOVERED");
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_orphan" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({
      received: true,
      recovered: true,
    });
    expect(finalizeReceiptMock).toHaveBeenCalledWith(
      expect.anything(),
      { outcome: WebhookOutcome.PROCESSED },
    );
  });

  it("allows a real retry after a temporary failure", async () => {
    claimReceiptMock
      .mockResolvedValueOnce(claimed("receipt_1", 0))
      .mockResolvedValueOnce(claimed("receipt_1", 1));
    reconcileMock
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({ paymentId: "payment_1", outcome: "SUCCEEDED" });
    const requestBody = {
      type: "payment-intent.succeeded",
      data: { id: "intent_1" },
    };

    const first = await POST(webhookRequest(requestBody));
    const second = await POST(webhookRequest(requestBody));

    expect(first.status).toBe(500);
    expect(second.status).toBe(200);
    expect(reconcileMock).toHaveBeenCalledTimes(2);
    expect(finalizeReceiptMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        outcome: WebhookOutcome.FAILED,
        errorCode: "TEMPORARY_PROCESSING_FAILURE",
      },
    );
    expect(finalizeReceiptMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { outcome: WebhookOutcome.PROCESSED },
    );
  });

  it("does not process further retries after a retry succeeds", async () => {
    claimReceiptMock
      .mockResolvedValueOnce(claimed("receipt_1", 0))
      .mockResolvedValueOnce(claimed("receipt_1", 1))
      .mockResolvedValue({
        status: "DUPLICATE",
        outcome: WebhookOutcome.PROCESSED,
      });
    reconcileMock
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({ paymentId: "payment_1", outcome: "SUCCEEDED" });
    const requestBody = {
      type: "payment-intent.succeeded",
      data: { id: "intent_1" },
    };

    const responses = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      responses.push(await POST(webhookRequest(requestBody)));
    }

    expect(responses.map((response) => response.status)).toEqual([
      500, 200, 200, 200,
    ]);
    expect(reconcileMock).toHaveBeenCalledTimes(2);
  });

  it("still returns 500 when failure auditing is unavailable", async () => {
    reconcileMock.mockRejectedValue(new Error("temporary"));
    finalizeReceiptMock.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_1" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await responseBody(response)).toEqual({
      received: false,
      code: "TEMPORARY_PROCESSING_FAILURE",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookOutcome } from "@/generated/prisma/client";

const {
  mockEnv,
  receiptCreateMock,
  reconcileMock,
  MockOnvoPaymentNotFoundError,
} = vi.hoisted(() => {
  class OnvoPaymentNotFoundError extends Error {}

  return {
    mockEnv: {
      ONVO_WEBHOOK_SECRET: "webhook_secret_test",
    } as { ONVO_WEBHOOK_SECRET?: string },
    receiptCreateMock: vi.fn(),
    reconcileMock: vi.fn(),
    MockOnvoPaymentNotFoundError: OnvoPaymentNotFoundError,
  };
});

vi.mock("@/config/env", () => ({ env: mockEnv }));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    webhookReceipt: {
      create: receiptCreateMock,
    },
  },
}));

vi.mock("@/server/payments/onvo/reconcile", () => ({
  OnvoPaymentNotFoundError: MockOnvoPaymentNotFoundError,
  reconcileOnvoPaymentIntent: reconcileMock,
}));

import { POST } from "@/app/api/webhooks/onvo/route";

const webhookUrl = "http://localhost:3000/api/webhooks/onvo";

function webhookRequest(
  body: string | object,
  secret: string | null = "webhook_secret_test",
) {
  const headers = new Headers({ "content-type": "application/json" });

  if (secret !== null) {
    headers.set("x-webhook-secret", secret);
  }

  return new Request(webhookUrl, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/webhooks/onvo", () => {
  beforeEach(() => {
    mockEnv.ONVO_WEBHOOK_SECRET = "webhook_secret_test";
    receiptCreateMock.mockReset().mockResolvedValue({ id: "receipt_1" });
    reconcileMock.mockReset().mockResolvedValue({
      paymentId: "payment_1",
      outcome: "SUCCEEDED",
    });
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
    expect(reconcileMock).not.toHaveBeenCalled();
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
      expect(await responseBody(response)).toEqual({
        received: false,
        code: "INVALID_WEBHOOK_SECRET",
      });
    }

    expect(reconcileMock).not.toHaveBeenCalled();
    expect(receiptCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 without persisting an invalid JSON body", async () => {
    const response = await POST(webhookRequest("not-json"));

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({
      received: false,
      code: "INVALID_JSON",
    });
    expect(receiptCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid webhook envelope", async () => {
    const response = await POST(
      webhookRequest({ type: "payment-intent.succeeded" }),
    );

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({
      received: false,
      code: "INVALID_PAYLOAD",
    });
  });

  it("ignores unsupported events even when data has no id", async () => {
    const response = await POST(
      webhookRequest({
        type: "mobile-transfer.received",
        data: {
          amount: 350_000,
          currency: "CRC",
          SINPERefNumber: "diagnostic",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({
      received: true,
      ignored: true,
    });
    expect(reconcileMock).not.toHaveBeenCalled();
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "mobile-transfer.received",
        providerObjectId: null,
        outcome: WebhookOutcome.IGNORED,
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
    expect(await responseBody(response)).toEqual({
      received: false,
      code: "PAYMENT_INTENT_ID_MISSING",
    });
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerObjectId: null,
        outcome: WebhookOutcome.REQUIRES_REVIEW,
        errorCode: "PAYMENT_INTENT_ID_MISSING",
      }),
    });
  });

  it.each([
    "payment-intent.succeeded",
    "payment-intent.failed",
    "payment-intent.deferred",
  ])("reconciles the supported event %s", async (eventType) => {
    const response = await POST(
      webhookRequest({
        type: eventType,
        data: { id: "intent_1", customer: { email: "private@example.com" } },
      }),
    );

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ received: true });
    expect(reconcileMock).toHaveBeenCalledWith("intent_1");
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType,
        providerObjectId: "intent_1",
        outcome: WebhookOutcome.PROCESSED,
        payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });

    const persistedData = receiptCreateMock.mock.calls[0][0].data;
    expect(persistedData).not.toHaveProperty("payload");
    expect(persistedData).not.toHaveProperty("customer");
  });

  it("records a valid provider payment that requires review", async () => {
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
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outcome: WebhookOutcome.REQUIRES_REVIEW,
        errorCode: "PAYMENT_REQUIRES_REVIEW",
      }),
    });
  });

  it("acknowledges an unknown local PaymentIntent for durable review", async () => {
    reconcileMock.mockRejectedValue(new MockOnvoPaymentNotFoundError());

    const response = await POST(
      webhookRequest({
        type: "payment-intent.succeeded",
        data: { id: "intent_unknown" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({
      received: true,
      review: true,
    });
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerObjectId: "intent_unknown",
        outcome: WebhookOutcome.REQUIRES_REVIEW,
        errorCode: "LOCAL_PAYMENT_NOT_FOUND",
      }),
    });
  });

  it("returns 500 for a temporary reconciliation failure", async () => {
    reconcileMock.mockRejectedValue(new Error("temporary"));

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
    expect(receiptCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outcome: WebhookOutcome.FAILED,
        errorCode: "TEMPORARY_PROCESSING_FAILURE",
      }),
    });
  });

  it("still returns 500 when a database outage also prevents failure auditing", async () => {
    reconcileMock.mockRejectedValue(new Error("temporary"));
    receiptCreateMock.mockRejectedValue(new Error("database unavailable"));

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

import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookOutcome } from "@/generated/prisma/client";

const {
  createMock,
  updateManyMock,
  findUniqueMock,
  findUniqueOrThrowMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findUniqueOrThrowMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    webhookReceipt: {
      create: createMock,
      updateMany: updateManyMock,
      findUnique: findUniqueMock,
      findUniqueOrThrow: findUniqueOrThrowMock,
    },
  },
}));

import {
  claimWebhookReceipt,
  finalizeWebhookReceipt,
} from "@/server/payments/onvo/webhook-receipts";

const input = {
  eventType: "payment-intent.succeeded",
  providerObjectId: "intent_1",
  payloadHash: "payload-hash",
  deduplicationKey: "deduplication-key",
};
const now = new Date("2026-08-22T12:00:00.000Z");

describe("ONVO webhook receipt claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({ id: "receipt_1" });
    updateManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValue({ outcome: WebhookOutcome.PROCESSING });
    findUniqueOrThrowMock.mockResolvedValue({ id: "receipt_1" });
  });

  it("creates PROCESSING before the caller starts reconciliation", async () => {
    await expect(claimWebhookReceipt(input, now)).resolves.toEqual({
      status: "CLAIMED",
      claim: { receiptId: "receipt_1", processingStartedAt: now },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deduplicationKey: input.deduplicationKey,
        outcome: WebhookOutcome.PROCESSING,
        processingStartedAt: now,
        processedAt: null,
      }),
      select: { id: true },
    });
  });

  it("treats a terminal receipt as an idempotent duplicate", async () => {
    createMock.mockRejectedValue({ code: "P2002" });
    findUniqueMock.mockResolvedValue({ outcome: WebhookOutcome.PROCESSED });

    await expect(claimWebhookReceipt(input, now)).resolves.toEqual({
      status: "DUPLICATE",
      outcome: WebhookOutcome.PROCESSED,
    });
    expect(updateManyMock).toHaveBeenCalledTimes(1);
  });

  it("atomically reclaims a FAILED receipt", async () => {
    createMock.mockRejectedValue({ code: "P2002" });
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(claimWebhookReceipt(input, now)).resolves.toEqual({
      status: "CLAIMED",
      claim: { receiptId: "receipt_1", processingStartedAt: now },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deduplicationKey: input.deduplicationKey,
        OR: expect.arrayContaining([
          { outcome: WebhookOutcome.FAILED },
        ]),
      }),
      data: expect.objectContaining({
        outcome: WebhookOutcome.PROCESSING,
        processingStartedAt: now,
        processedAt: null,
        errorCode: null,
      }),
    });
  });

  it("returns PROCESSING when another request owns a fresh claim", async () => {
    createMock.mockRejectedValue({ code: "P2002" });
    findUniqueMock.mockResolvedValue({ outcome: WebhookOutcome.PROCESSING });

    await expect(claimWebhookReceipt(input, now)).resolves.toEqual({
      status: "PROCESSING",
    });
    expect(findUniqueOrThrowMock).not.toHaveBeenCalled();
  });

  it("allows legacy LOCAL_PAYMENT_NOT_FOUND receipts to be retried", async () => {
    createMock.mockRejectedValue({ code: "P2002" });
    updateManyMock.mockResolvedValue({ count: 1 });

    await claimWebhookReceipt(input, now);

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              outcome: WebhookOutcome.REQUIRES_REVIEW,
              errorCode: "LOCAL_PAYMENT_NOT_FOUND",
            },
          ]),
        }),
      }),
    );
  });

  it("finalizes only the request that still owns the claim token", async () => {
    updateManyMock.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({
      count: 0,
    });
    const claim = { receiptId: "receipt_1", processingStartedAt: now };

    await expect(
      finalizeWebhookReceipt(claim, {
        outcome: WebhookOutcome.PROCESSED,
      }),
    ).resolves.toBe(true);
    await expect(
      finalizeWebhookReceipt(claim, {
        outcome: WebhookOutcome.FAILED,
        errorCode: "TEMPORARY_PROCESSING_FAILURE",
      }),
    ).resolves.toBe(false);
    expect(updateManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: "receipt_1",
          outcome: WebhookOutcome.PROCESSING,
          processingStartedAt: now,
        },
        data: expect.objectContaining({
          outcome: WebhookOutcome.PROCESSED,
          processingStartedAt: null,
        }),
      }),
    );
  });
});

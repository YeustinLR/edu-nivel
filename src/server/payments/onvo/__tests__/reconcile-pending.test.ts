import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findManyMock,
  paymentUpdateManyMock,
  reconcileMock,
  recoverMock,
  refundFindManyMock,
  reconcileRefundMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  paymentUpdateManyMock: vi.fn(),
  reconcileMock: vi.fn(),
  recoverMock: vi.fn(),
  refundFindManyMock: vi.fn(),
  reconcileRefundMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    payment: {
      findMany: findManyMock,
      updateMany: paymentUpdateManyMock,
    },
    paymentRefund: {
      findMany: refundFindManyMock,
    },
  },
}));
vi.mock("@/server/payments/onvo/reconcile", () => ({
  reconcileOnvoPaymentIntent: reconcileMock,
}));
vi.mock("@/server/payments/onvo/recover-payment-intent", () => ({
  recoverOnvoPaymentIntent: recoverMock,
}));
vi.mock("@/server/payments/onvo/refunds", () => ({
  reconcileOnvoRefund: reconcileRefundMock,
}));

import { reconcilePendingOnvoPayments } from "@/server/payments/onvo/reconcile-pending";

const now = new Date("2026-07-23T18:00:00.000Z");

describe("reconcilePendingOnvoPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentUpdateManyMock.mockResolvedValue({ count: 1 });
    refundFindManyMock.mockResolvedValue([]);
  });

  it("reconciles a bounded eligible batch and marks only old processing attempts", async () => {
    findManyMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "old",
        providerPaymentIntentId: "intent_old",
        createdAt: new Date("2026-07-23T17:00:00.000Z"),
        staleAt: null,
      },
      {
        id: "success",
        providerPaymentIntentId: "intent_success",
        createdAt: new Date("2026-07-23T17:50:00.000Z"),
        staleAt: null,
      },
      {
        id: "temporary",
        providerPaymentIntentId: "intent_temporary",
        createdAt: new Date("2026-07-23T17:00:00.000Z"),
        staleAt: null,
      },
    ]);
    reconcileMock
      .mockResolvedValueOnce({ paymentId: "old", outcome: "PROCESSING" })
      .mockResolvedValueOnce({ paymentId: "success", outcome: "SUCCEEDED" })
      .mockRejectedValueOnce(new Error("temporary"));

    const summary = await reconcilePendingOnvoPayments(now);

    expect(findManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 20,
        where: expect.objectContaining({
          providerPaymentIntentId: { not: null },
          updatedAt: { lte: new Date("2026-07-23T17:55:00.000Z") },
        }),
      }),
    );
    expect(summary).toEqual({
      selected: 3,
      succeeded: 1,
      processing: 1,
      terminal: 0,
      review: 0,
      alreadyApplied: 0,
      failed: 1,
      orphanSelected: 0,
      recovered: 0,
      abandoned: 0,
      refundSelected: 0,
      refundSucceeded: 0,
      refundPending: 0,
      refundReview: 0,
      refundAlreadyApplied: 0,
      refundFailed: 0,
    });
    expect(paymentUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(paymentUpdateManyMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "old",
        staleAt: null,
      }),
      data: { staleAt: now },
    });
  });
});

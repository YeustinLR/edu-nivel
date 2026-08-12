import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findManyMock,
  paymentUpdateManyMock,
  reconcileMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  paymentUpdateManyMock: vi.fn(),
  reconcileMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    payment: {
      findMany: findManyMock,
      updateMany: paymentUpdateManyMock,
    },
  },
}));
vi.mock("@/server/payments/onvo/reconcile", () => ({
  reconcileOnvoPaymentIntent: reconcileMock,
}));

import { reconcilePendingOnvoPayments } from "@/server/payments/onvo/reconcile-pending";

const now = new Date("2026-07-23T18:00:00.000Z");

describe("reconcilePendingOnvoPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentUpdateManyMock.mockResolvedValue({ count: 1 });
  });

  it("reconciles a bounded eligible batch and marks only old processing attempts", async () => {
    findManyMock.mockResolvedValue([
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

    expect(findManyMock).toHaveBeenCalledWith(
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

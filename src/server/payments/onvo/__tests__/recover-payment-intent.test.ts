import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentStatus, ProviderMode } from "@/generated/prisma/client";

const { findUniqueMock, updateMock, updateManyMock, listMock, reconcileMock } =
  vi.hoisted(() => ({
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
    updateManyMock: vi.fn(),
    listMock: vi.fn(),
    reconcileMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    payment: {
      findUnique: findUniqueMock,
      update: updateMock,
      updateMany: updateManyMock,
    },
  },
}));
vi.mock("@/server/payments/onvo/client", () => ({
  getOnvoPaymentIntent: vi.fn(),
  listOnvoPaymentIntents: listMock,
}));
vi.mock("@/server/payments/onvo/reconcile", () => ({
  reconcileOnvoPaymentIntent: reconcileMock,
}));

import { recoverOnvoPaymentIntent } from "@/server/payments/onvo/recover-payment-intent";

const now = new Date("2026-08-12T18:00:00.000Z");
const payment = {
  id: "payment_1",
  userId: "user_1",
  levelId: "level_1",
  planCode: "STUDENT_MONTHLY",
  expectedAmountMinor: 350_000,
  currency: "CRC",
  providerMode: ProviderMode.TEST,
  providerPaymentIntentId: null,
  appliedAt: null,
  internalReference: "EDUNIVEL-1",
  status: PaymentStatus.INITIALIZING,
  createdAt: new Date("2026-08-12T17:00:00.000Z"),
};

function matchingIntent(id = "intent_1") {
  return {
    id,
    mode: "test",
    amount: 350_000,
    receivedAmount: 0,
    currency: "CRC",
    status: "processing",
    metadata: {
      paymentId: payment.id,
      internalReference: payment.internalReference,
      userId: payment.userId,
      levelId: payment.levelId,
      planCode: payment.planCode,
    },
  };
}

describe("recoverOnvoPaymentIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue(payment);
    updateManyMock.mockResolvedValue({ count: 1 });
    reconcileMock.mockResolvedValue({ paymentId: payment.id, outcome: "PROCESSING" });
  });

  it("claims and reconciles exactly one provider intent with matching metadata", async () => {
    listMock.mockResolvedValue({ data: [matchingIntent()], meta: {} });

    await expect(recoverOnvoPaymentIntent(payment.id, now)).resolves.toBe(
      "RECOVERED",
    );
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerPaymentIntentId: "intent_1" }),
      }),
    );
    expect(reconcileMock).toHaveBeenCalledWith("intent_1");
  });

  it("does not guess when multiple provider intents match", async () => {
    listMock.mockResolvedValue({
      data: [matchingIntent("intent_1"), matchingIntent("intent_2")],
      meta: {},
    });

    await expect(recoverOnvoPaymentIntent(payment.id, now)).resolves.toBe(
      "REQUIRES_REVIEW",
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: "MULTIPLE_ONVO_INTENTS_FOUND" }),
      }),
    );
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("releases an old local checkout only after a complete provider search finds nothing", async () => {
    listMock.mockResolvedValue({ data: [], meta: {} });

    await expect(recoverOnvoPaymentIntent(payment.id, now)).resolves.toBe(
      "ABANDONED",
    );
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.FAILED,
          errorCode: "ONVO_INTENT_NOT_CREATED",
        }),
      }),
    );
  });
});

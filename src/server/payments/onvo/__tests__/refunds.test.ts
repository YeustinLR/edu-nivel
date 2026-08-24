import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PaymentStatus,
  ProviderMode,
  RefundStatus,
  SubscriptionStatus,
} from "@/generated/prisma/client";

const {
  getRefundMock,
  refundFindUniqueMock,
  refundUpdateMock,
  transactionMock,
  txRefundFindUniqueMock,
  txRefundUpdateMock,
  txPaymentUpdateMock,
  txSubscriptionFindUniqueMock,
  txSubscriptionUpdateMock,
  txPaymentFindManyMock,
  logPaymentEventMock,
} = vi.hoisted(() => ({
  getRefundMock: vi.fn(),
  refundFindUniqueMock: vi.fn(),
  refundUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  txRefundFindUniqueMock: vi.fn(),
  txRefundUpdateMock: vi.fn(),
  txPaymentUpdateMock: vi.fn(),
  txSubscriptionFindUniqueMock: vi.fn(),
  txSubscriptionUpdateMock: vi.fn(),
  txPaymentFindManyMock: vi.fn(),
  logPaymentEventMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/payments/onvo/client", () => ({
  getOnvoRefund: getRefundMock,
}));
vi.mock("@/server/payments/onvo/payment-log", () => ({
  logOnvoPaymentEvent: logPaymentEventMock,
}));

const tx = {
  paymentRefund: {
    findUnique: txRefundFindUniqueMock,
    update: txRefundUpdateMock,
  },
  payment: {
    update: txPaymentUpdateMock,
    findMany: txPaymentFindManyMock,
  },
  subscription: {
    findUnique: txSubscriptionFindUniqueMock,
    update: txSubscriptionUpdateMock,
  },
};

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    paymentRefund: {
      findUnique: refundFindUniqueMock,
      update: refundUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { registerManualOnvoRefund } from "@/server/payments/onvo/refunds";

const payment = {
  id: "payment_1",
  subscriptionId: "subscription_1",
  status: PaymentStatus.SUCCEEDED,
  appliedAt: new Date("2026-08-01T12:00:01.000Z"),
  providerPaymentIntentId: "intent_1",
};

function refundCase() {
  return {
    id: "refund_case_1",
    paymentId: payment.id,
    providerMode: ProviderMode.TEST,
    providerRefundId: null,
    expectedAmountMinor: 350_000,
    currency: "CRC",
    status: RefundStatus.REQUESTED,
    appliedAt: null,
    payment,
  };
}

function providerRefund(overrides: Record<string, unknown> = {}) {
  return {
    id: "refund_onvo_1",
    paymentIntentId: "intent_1",
    amount: 350_000,
    currency: "CRC",
    mode: "test" as const,
    status: "succeeded" as const,
    reason: "requested_by_customer",
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-10T12:01:00.000Z",
    ...overrides,
  };
}

function driverTransactionWriteConflict() {
  return Object.assign(new Error("TransactionWriteConflict"), {
    name: "DriverAdapterError",
    cause: { kind: "TransactionWriteConflict" },
  });
}

describe("manual ONVO refund reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refundFindUniqueMock.mockResolvedValue(refundCase());
    getRefundMock.mockResolvedValue(providerRefund());
    transactionMock.mockImplementation(async (callback) => callback(tx));
    txRefundFindUniqueMock.mockResolvedValue(refundCase());
    txSubscriptionFindUniqueMock.mockResolvedValue({
      id: "subscription_1",
      currentPeriodStart: new Date("2026-08-01T12:00:00.000Z"),
      currentPeriodEnd: new Date("2026-09-01T12:00:00.000Z"),
    });
    txPaymentFindManyMock.mockResolvedValue([]);
    txPaymentUpdateMock.mockResolvedValue(payment);
    txSubscriptionUpdateMock.mockResolvedValue({ id: "subscription_1" });
    txRefundUpdateMock.mockResolvedValue(refundCase());
    refundUpdateMock.mockResolvedValue(refundCase());
  });

  it("stores a pending full refund without changing access", async () => {
    getRefundMock.mockResolvedValue(providerRefund({ status: "pending" }));

    await expect(
      registerManualOnvoRefund({
        refundCaseId: "refund_case_1",
        providerRefundId: "refund_onvo_1",
      }),
    ).resolves.toMatchObject({ outcome: "PENDING" });

    expect(refundUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: RefundStatus.PENDING }),
      }),
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("flags a partial refund and does not recalculate access", async () => {
    getRefundMock.mockResolvedValue(providerRefund({ amount: 175_000 }));

    await expect(
      registerManualOnvoRefund({
        refundCaseId: "refund_case_1",
        providerRefundId: "refund_onvo_1",
      }),
    ).resolves.toMatchObject({ outcome: "REQUIRES_REVIEW" });

    expect(refundUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RefundStatus.REQUIRES_REVIEW,
          errorCode: "PARTIAL_REFUND_NOT_SUPPORTED",
        }),
      }),
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("applies a total refund and revokes a single-payment subscription", async () => {
    await expect(
      registerManualOnvoRefund({
        refundCaseId: "refund_case_1",
        providerRefundId: "refund_onvo_1",
      }),
    ).resolves.toMatchObject({ outcome: "SUCCEEDED" });

    expect(txPaymentUpdateMock).toHaveBeenCalledWith({
      where: { id: payment.id },
      data: expect.objectContaining({ status: PaymentStatus.REFUNDED }),
    });
    expect(txSubscriptionUpdateMock).toHaveBeenCalledWith({
      where: { id: "subscription_1" },
      data: expect.objectContaining({
        status: SubscriptionStatus.REFUNDED,
        currentPeriodEnd: new Date("2026-08-10T12:01:00.000Z"),
      }),
    });
    expect(txRefundUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RefundStatus.SUCCEEDED,
          appliedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("retries a structured adapter conflict in a fresh refund transaction", async () => {
    transactionMock.mockRejectedValueOnce(driverTransactionWriteConflict());

    await expect(
      registerManualOnvoRefund({
        refundCaseId: "refund_case_1",
        providerRefundId: "refund_onvo_1",
      }),
    ).resolves.toMatchObject({ outcome: "SUCCEEDED" });

    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(logPaymentEventMock).toHaveBeenCalledWith({
      event: "refund.transaction.conflict.retry",
      outcome: "attempt-1-of-3",
      refundId: "refund_case_1",
    });
  });

  it("does not apply the same refund twice", async () => {
    txRefundFindUniqueMock.mockResolvedValue({
      ...refundCase(),
      providerRefundId: "refund_onvo_1",
      appliedAt: new Date("2026-08-10T12:01:01.000Z"),
    });

    await expect(
      registerManualOnvoRefund({
        refundCaseId: "refund_case_1",
        providerRefundId: "refund_onvo_1",
      }),
    ).resolves.toMatchObject({ outcome: "ALREADY_APPLIED" });

    expect(txPaymentUpdateMock).not.toHaveBeenCalled();
    expect(txSubscriptionUpdateMock).not.toHaveBeenCalled();
  });
});

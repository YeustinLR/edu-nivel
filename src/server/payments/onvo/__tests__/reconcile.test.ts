import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BillingInterval,
  PaymentStatus,
  PlanCode,
  Prisma,
  ProviderMode,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/client";
import type { OnvoPaymentIntent } from "@/server/payments/onvo/schemas";

const {
  getIntentMock,
  outerPaymentFindUniqueMock,
  paymentUpdateMock,
  transactionMock,
  txPaymentFindUniqueMock,
  txPaymentUpdateManyMock,
  txPaymentFindManyMock,
  txPaymentUpdateMock,
  txSubscriptionFindUniqueMock,
  txSubscriptionUpsertMock,
  txSubscriptionUpdateMock,
  flagRefundMock,
  logPaymentEventMock,
} = vi.hoisted(() => ({
  getIntentMock: vi.fn(),
  outerPaymentFindUniqueMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  txPaymentFindUniqueMock: vi.fn(),
  txPaymentUpdateManyMock: vi.fn(),
  txPaymentFindManyMock: vi.fn(),
  txPaymentUpdateMock: vi.fn(),
  txSubscriptionFindUniqueMock: vi.fn(),
  txSubscriptionUpsertMock: vi.fn(),
  txSubscriptionUpdateMock: vi.fn(),
  flagRefundMock: vi.fn(),
  logPaymentEventMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/payments/onvo/client", () => ({
  getOnvoPaymentIntent: getIntentMock,
}));

vi.mock("@/server/payments/onvo/refunds", () => ({
  flagProviderRefundWithoutId: flagRefundMock,
}));

vi.mock("@/server/payments/onvo/payment-log", () => ({
  logOnvoPaymentEvent: logPaymentEventMock,
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    payment: {
      findUnique: outerPaymentFindUniqueMock,
      update: paymentUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import {
  reconcileOnvoPaymentIntent,
} from "@/server/payments/onvo/reconcile";
import { isRetryableSerializableConflict } from "@/server/payments/onvo/serializable-transaction";

const tx = {
  payment: {
    findUnique: txPaymentFindUniqueMock,
    findMany: txPaymentFindManyMock,
    update: txPaymentUpdateMock,
    updateMany: txPaymentUpdateManyMock,
  },
  subscription: {
    findUnique: txSubscriptionFindUniqueMock,
    upsert: txSubscriptionUpsertMock,
    update: txSubscriptionUpdateMock,
  },
};

type TestPaymentOptions = {
  id?: string;
  providerPaymentIntentId?: string;
  planCode?: PlanCode;
  product?: SubscriptionProduct;
  billingInterval?: BillingInterval;
  durationMonths?: number;
  expectedAmountMinor?: number;
  roleAtCheckout?: Role;
  subscriptionId?: string | null;
  appliedAt?: Date | null;
  status?: PaymentStatus;
};

function makePayment(options: TestPaymentOptions = {}) {
  const id = options.id ?? "payment_monthly";

  return {
    id,
    userId: "user_student",
    levelId: "level_7",
    subscriptionId: options.subscriptionId ?? null,
    planCode: options.planCode ?? PlanCode.STUDENT_MONTHLY,
    product: options.product ?? SubscriptionProduct.STUDENT_PREMIUM,
    billingInterval: options.billingInterval ?? BillingInterval.MONTHLY,
    durationMonths: options.durationMonths ?? 1,
    roleAtCheckout: options.roleAtCheckout ?? Role.STUDENT,
    expectedAmountMinor: options.expectedAmountMinor ?? 350_000,
    receivedAmountMinor: null,
    currency: "CRC",
    provider: "ONVO",
    method: "SINPE_MOBILE",
    providerMode: ProviderMode.TEST,
    providerStatus: "processing",
    providerPaymentIntentId:
      options.providerPaymentIntentId ?? "intent_monthly",
    providerPaymentMethodId: `method_${id}`,
    providerChargeId: null,
    internalReference: `EDU-${id}`,
    checkoutRequestId: `checkout_${id}`,
    status: options.status ?? PaymentStatus.PROCESSING,
    confirmedAt: null,
    appliedAt: options.appliedAt ?? null,
    staleAt: null,
    payerPhoneLast4: "8888",
    payerIdentificationLast4: "0101",
    payerIdentificationType: 1,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date("2026-07-23T17:00:00.000Z"),
    updatedAt: new Date("2026-07-23T17:00:00.000Z"),
  };
}

function makeSucceededIntent(
  payment: ReturnType<typeof makePayment>,
  updatedAt = "2026-07-23T18:00:00.000Z",
): OnvoPaymentIntent {
  return {
    id: payment.providerPaymentIntentId,
    mode: "test",
    amount: payment.expectedAmountMinor,
    receivedAmount: payment.expectedAmountMinor,
    currency: "CRC",
    status: "succeeded",
    paymentMethodId: payment.providerPaymentMethodId,
    metadata: {
      paymentId: payment.id,
      internalReference: payment.internalReference,
      userId: payment.userId,
      planCode: payment.planCode,
      levelId: payment.levelId,
    },
    charges: [
      {
        id: `charge_${payment.id}`,
        amount: payment.expectedAmountMinor,
        status: "succeeded",
        isApproved: true,
      },
    ],
    updatedAt,
  };
}

function p2034Error() {
  return new Prisma.PrismaClientKnownRequestError(
    "Transaction failed due to a write conflict.",
    { code: "P2034", clientVersion: "7.8.0" },
  );
}

function driverTransactionWriteConflict() {
  return Object.assign(new Error("TransactionWriteConflict"), {
    name: "DriverAdapterError",
    cause: { kind: "TransactionWriteConflict" },
  });
}

describe("reconcileOnvoPaymentIntent subscription application", () => {
  beforeEach(() => {
    const payment = makePayment();

    vi.clearAllMocks();
    outerPaymentFindUniqueMock.mockResolvedValue(payment);
    getIntentMock.mockResolvedValue(makeSucceededIntent(payment));
    txPaymentFindUniqueMock.mockResolvedValue({
      ...payment,
      user: {
        id: payment.userId,
        emailVerified: true,
        role: Role.STUDENT,
      },
      level: { isActive: true, requiresSubscription: true },
    });
    txSubscriptionFindUniqueMock.mockResolvedValue(null);
    txSubscriptionUpsertMock.mockResolvedValue({ id: "subscription_1" });
    txPaymentUpdateManyMock.mockResolvedValue({ count: 1 });
    txPaymentFindManyMock.mockResolvedValue([]);
    txPaymentUpdateMock.mockResolvedValue(payment);
    txSubscriptionUpdateMock.mockResolvedValue({ id: "subscription_1" });
    paymentUpdateMock.mockResolvedValue(payment);
    transactionMock.mockImplementation(async (callback) => callback(tx));
  });

  it("retries P2034 with a fresh transaction and then succeeds", async () => {
    transactionMock.mockRejectedValueOnce(p2034Error());

    await expect(
      reconcileOnvoPaymentIntent("intent_monthly"),
    ).resolves.toEqual({
      paymentId: "payment_monthly",
      outcome: "SUCCEEDED",
    });
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(logPaymentEventMock).toHaveBeenCalledWith({
      event: "transaction.conflict.retry",
      outcome: "attempt-1-of-3",
      paymentId: "payment_monthly",
    });
  });

  it("retries the adapter's structured TransactionWriteConflict", async () => {
    transactionMock.mockRejectedValueOnce(driverTransactionWriteConflict());

    await expect(
      reconcileOnvoPaymentIntent("intent_monthly"),
    ).resolves.toMatchObject({ outcome: "SUCCEEDED" });
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(logPaymentEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "transaction.conflict.retry",
        outcome: "attempt-1-of-3",
      }),
    );
  });

  it("stops after three retryable serialization conflicts", async () => {
    const conflict = driverTransactionWriteConflict();
    transactionMock.mockRejectedValue(conflict);

    await expect(
      reconcileOnvoPaymentIntent("intent_monthly"),
    ).rejects.toBe(conflict);
    expect(transactionMock).toHaveBeenCalledTimes(3);
    expect(logPaymentEventMock).toHaveBeenLastCalledWith({
      event: "transaction.conflict.exhausted",
      outcome: "attempt-3-of-3",
      paymentId: "payment_monthly",
    });
  });

  it("does not retry validation errors or message-only lookalikes", async () => {
    const validationError = new Error(
      "TransactionWriteConflict mentioned without a structured cause",
    );
    transactionMock.mockRejectedValue(validationError);

    await expect(
      reconcileOnvoPaymentIntent("intent_monthly"),
    ).rejects.toBe(validationError);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(logPaymentEventMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: "transaction.conflict.retry" }),
    );
    expect(isRetryableSerializableConflict(validationError)).toBe(false);
    expect(
      isRetryableSerializableConflict({
        name: "DriverAdapterError",
        cause: { kind: "UniqueConstraintViolation" },
      }),
    ).toBe(false);
  });

  it("creates a new period from ONVO's confirmation timestamp", async () => {
    const result = await reconcileOnvoPaymentIntent("intent_monthly");

    expect(result).toEqual({
      paymentId: "payment_monthly",
      outcome: "SUCCEEDED",
    });
    expect(txSubscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          currentPeriodStart: new Date("2026-07-23T18:00:00.000Z"),
          currentPeriodEnd: new Date("2026-08-23T18:00:00.000Z"),
          lastPlanCode: PlanCode.STUDENT_MONTHLY,
        }),
      }),
    );
  });

  it("applies a matching teacher payment to a teacher subscription", async () => {
    const teacherPayment = makePayment({
      id: "teacher_payment_yearly",
      providerPaymentIntentId: "teacher_intent_yearly",
      planCode: PlanCode.TEACHER_YEARLY,
      product: SubscriptionProduct.TEACHER_PREMIUM,
      billingInterval: BillingInterval.YEARLY,
      durationMonths: 12,
      expectedAmountMinor: 6_240_000,
      roleAtCheckout: Role.TEACHER,
    });
    outerPaymentFindUniqueMock.mockResolvedValue(teacherPayment);
    getIntentMock.mockResolvedValue(makeSucceededIntent(teacherPayment));
    txPaymentFindUniqueMock.mockResolvedValue({
      ...teacherPayment,
      user: {
        id: teacherPayment.userId,
        emailVerified: true,
        role: Role.TEACHER,
      },
      level: { isActive: true, requiresSubscription: true },
    });

    await expect(
      reconcileOnvoPaymentIntent("teacher_intent_yearly"),
    ).resolves.toEqual({
      paymentId: "teacher_payment_yearly",
      outcome: "SUCCEEDED",
    });
    expect(txSubscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          product: SubscriptionProduct.TEACHER_PREMIUM,
          lastPlanCode: PlanCode.TEACHER_YEARLY,
          currentPeriodEnd: new Date("2027-07-23T18:00:00.000Z"),
        }),
      }),
    );
  });

  it("applies two different confirmed payments cumulatively", async () => {
    const monthly = makePayment();
    const yearly = makePayment({
      id: "payment_yearly",
      providerPaymentIntentId: "intent_yearly",
      planCode: PlanCode.STUDENT_YEARLY,
      billingInterval: BillingInterval.YEARLY,
      durationMonths: 12,
      expectedAmountMinor: 3_360_000,
    });
    const payments = new Map([
      [monthly.providerPaymentIntentId, monthly],
      [yearly.providerPaymentIntentId, yearly],
    ]);
    let subscription = {
      id: "subscription_1",
      userId: monthly.userId,
      product: SubscriptionProduct.STUDENT_PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
      currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
      lastPlanCode: PlanCode.STUDENT_MONTHLY,
    };

    outerPaymentFindUniqueMock.mockImplementation(({ where }) =>
      Promise.resolve(payments.get(where.providerPaymentIntentId)),
    );
    getIntentMock.mockImplementation((intentId) => {
      const payment = payments.get(intentId);
      return Promise.resolve(makeSucceededIntent(payment!));
    });
    txPaymentFindUniqueMock.mockImplementation(({ where }) => {
      const payment = [...payments.values()].find(
        (candidate) => candidate.id === where.id,
      );
      return Promise.resolve({
        ...payment,
        user: {
          id: payment?.userId,
          emailVerified: true,
          role: Role.STUDENT,
        },
        level: { isActive: true, requiresSubscription: true },
      });
    });
    txSubscriptionFindUniqueMock.mockImplementation(() =>
      Promise.resolve(subscription),
    );
    txSubscriptionUpsertMock.mockImplementation(({ update }) => {
      subscription = { ...subscription, ...update };
      return Promise.resolve(subscription);
    });

    expect(await reconcileOnvoPaymentIntent("intent_monthly")).toEqual({
      paymentId: monthly.id,
      outcome: "SUCCEEDED",
    });
    expect(await reconcileOnvoPaymentIntent("intent_yearly")).toEqual({
      paymentId: yearly.id,
      outcome: "SUCCEEDED",
    });

    expect(subscription.currentPeriodStart).toEqual(
      new Date("2026-07-01T12:00:00.000Z"),
    );
    expect(subscription.currentPeriodEnd).toEqual(
      new Date("2027-09-01T12:00:00.000Z"),
    );
    expect(subscription.lastPlanCode).toBe(PlanCode.STUDENT_YEARLY);
  });

  it("does not extend the period twice when the same payment is reconciled again", async () => {
    const payment = makePayment();
    let subscription = {
      id: "subscription_1",
      userId: payment.userId,
      product: SubscriptionProduct.STUDENT_PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
      currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
      lastPlanCode: PlanCode.STUDENT_MONTHLY,
    };

    outerPaymentFindUniqueMock.mockImplementation(() =>
      Promise.resolve(payment),
    );
    txPaymentFindUniqueMock.mockImplementation(() =>
      Promise.resolve({
        ...payment,
        user: {
          id: payment.userId,
          emailVerified: true,
          role: Role.STUDENT,
        },
        level: { isActive: true, requiresSubscription: true },
      }),
    );
    txSubscriptionFindUniqueMock.mockImplementation(() =>
      Promise.resolve(subscription),
    );
    txSubscriptionUpsertMock.mockImplementation(({ update }) => {
      subscription = { ...subscription, ...update };
      return Promise.resolve(subscription);
    });
    txPaymentUpdateManyMock.mockImplementation(({ data }) => {
      payment.appliedAt = data.appliedAt;
      return Promise.resolve({ count: 1 });
    });

    expect(await reconcileOnvoPaymentIntent("intent_monthly")).toEqual({
      paymentId: payment.id,
      outcome: "SUCCEEDED",
    });
    const endAfterFirstApplication = subscription.currentPeriodEnd;

    expect(await reconcileOnvoPaymentIntent("intent_monthly")).toEqual({
      paymentId: payment.id,
      outcome: "ALREADY_APPLIED",
    });
    expect(subscription.currentPeriodEnd).toEqual(endAfterFirstApplication);
    expect(txSubscriptionUpsertMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("stops a concurrent replay that observes an already applied payment in the transaction", async () => {
    const payment = makePayment();
    txPaymentFindUniqueMock.mockResolvedValue({
      ...payment,
      appliedAt: new Date("2026-07-23T18:00:01.000Z"),
      user: {
        id: payment.userId,
        emailVerified: true,
        role: Role.STUDENT,
      },
      level: { isActive: true, requiresSubscription: true },
    });

    expect(await reconcileOnvoPaymentIntent("intent_monthly")).toEqual({
      paymentId: payment.id,
      outcome: "ALREADY_APPLIED",
    });
    expect(txSubscriptionUpsertMock).not.toHaveBeenCalled();
    expect(txPaymentUpdateManyMock).not.toHaveBeenCalled();
  });

  it("holds a confirmed payment for review if the level changed before application", async () => {
    const payment = makePayment();
    txPaymentFindUniqueMock.mockResolvedValue({
      ...payment,
      user: {
        id: payment.userId,
        emailVerified: true,
        role: Role.STUDENT,
      },
      level: { isActive: false, requiresSubscription: true },
    });

    await expect(reconcileOnvoPaymentIntent("intent_monthly")).resolves.toEqual({
      paymentId: payment.id,
      outcome: "REQUIRES_REVIEW",
    });
    expect(txPaymentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.REQUIRES_REVIEW,
          errorCode: "LEVEL_CHANGED_BEFORE_APPLICATION",
        }),
      }),
    );
    expect(txSubscriptionUpsertMock).not.toHaveBeenCalled();
  });

  it("requires the refundId before recalculating a refunded payment", async () => {
    const payment = makePayment({
      subscriptionId: "subscription_1",
      appliedAt: new Date("2026-07-23T18:00:01.000Z"),
      status: PaymentStatus.SUCCEEDED,
    });
    outerPaymentFindUniqueMock.mockResolvedValue(payment);
    getIntentMock.mockResolvedValue({
      ...makeSucceededIntent(payment),
      status: "refunded",
      updatedAt: "2026-07-24T18:00:00.000Z",
    });
    flagRefundMock.mockResolvedValue(undefined);

    await expect(reconcileOnvoPaymentIntent("intent_monthly")).resolves.toEqual({
      paymentId: payment.id,
      outcome: "REQUIRES_REVIEW",
    });
    expect(flagRefundMock).toHaveBeenCalledWith({
      paymentId: payment.id,
      providerStatus: "refunded",
    });
    expect(txSubscriptionUpdateMock).not.toHaveBeenCalled();
  });
});

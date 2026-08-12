import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BillingInterval,
  PaymentStatus,
  PlanCode,
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
  txSubscriptionFindUniqueMock,
  txSubscriptionUpsertMock,
} = vi.hoisted(() => ({
  getIntentMock: vi.fn(),
  outerPaymentFindUniqueMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  txPaymentFindUniqueMock: vi.fn(),
  txPaymentUpdateManyMock: vi.fn(),
  txSubscriptionFindUniqueMock: vi.fn(),
  txSubscriptionUpsertMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/payments/onvo/client", () => ({
  getOnvoPaymentIntent: getIntentMock,
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

import { reconcileOnvoPaymentIntent } from "@/server/payments/onvo/reconcile";

const tx = {
  payment: {
    findUnique: txPaymentFindUniqueMock,
    update: paymentUpdateMock,
    updateMany: txPaymentUpdateManyMock,
  },
  subscription: {
    findUnique: txSubscriptionFindUniqueMock,
    upsert: txSubscriptionUpsertMock,
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
};

function makePayment(options: TestPaymentOptions = {}) {
  const id = options.id ?? "payment_monthly";

  return {
    id,
    userId: "user_student",
    levelId: "level_7",
    subscriptionId: null,
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
    status: PaymentStatus.PROCESSING,
    confirmedAt: null,
    appliedAt: null as Date | null,
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
    paymentUpdateMock.mockResolvedValue(payment);
    transactionMock.mockImplementation(async (callback) => callback(tx));
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
    expect(paymentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.REQUIRES_REVIEW,
          errorCode: "LEVEL_CHANGED_BEFORE_APPLICATION",
        }),
      }),
    );
    expect(txSubscriptionUpsertMock).not.toHaveBeenCalled();
  });
});

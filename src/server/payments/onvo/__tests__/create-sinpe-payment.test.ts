import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BillingInterval,
  PaymentStatus,
  PlanCode,
  ProviderMode,
  Role,
  SubscriptionProduct,
} from "@/generated/prisma/client";
import type { StartSinpePaymentInput } from "@/modules/payments/schemas/start-sinpe-payment.schema";

const {
  confirmIntentMock,
  createIntentMock,
  createMethodMock,
  paymentCreateMock,
  paymentFindUniqueMock,
  paymentFindUniqueOrThrowMock,
  paymentFindFirstMock,
  paymentUpdateMock,
  paymentUpdateManyMock,
  levelFindUniqueMock,
  reconcileMock,
  requireUserMock,
  rateLimitMock,
  MockOnvoApiError,
} = vi.hoisted(() => ({
  confirmIntentMock: vi.fn(),
  createIntentMock: vi.fn(),
  createMethodMock: vi.fn(),
  paymentCreateMock: vi.fn(),
  paymentFindUniqueMock: vi.fn(),
  paymentFindUniqueOrThrowMock: vi.fn(),
  paymentFindFirstMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  paymentUpdateManyMock: vi.fn(),
  levelFindUniqueMock: vi.fn(),
  reconcileMock: vi.fn(),
  requireUserMock: vi.fn(),
  rateLimitMock: vi.fn(),
  MockOnvoApiError: class OnvoApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string | null,
    ) {
      super("ONVO error");
    }
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/auth/guards", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    level: {
      findUnique: levelFindUniqueMock,
    },
    payment: {
      create: paymentCreateMock,
      findFirst: paymentFindFirstMock,
      findUnique: paymentFindUniqueMock,
      findUniqueOrThrow: paymentFindUniqueOrThrowMock,
      update: paymentUpdateMock,
      updateMany: paymentUpdateManyMock,
    },
  },
}));

vi.mock("@/server/payments/onvo/client", () => ({
  OnvoApiError: MockOnvoApiError,
  isDefinitiveOnvoApiRejection: (error: { status: number }) =>
    error.status >= 400 &&
    error.status < 500 &&
    ![408, 409, 425, 429].includes(error.status),
  confirmOnvoPaymentIntent: confirmIntentMock,
  createOnvoPaymentIntent: createIntentMock,
  createOnvoSinpeMobilePaymentMethod: createMethodMock,
}));

vi.mock("@/server/payments/onvo/checkout-rate-limit", () => ({
  CheckoutRateLimitError: class CheckoutRateLimitError extends Error {},
  enforceCheckoutRateLimit: rateLimitMock,
}));

vi.mock("@/server/payments/onvo/reconcile", () => ({
  providerModeFromEnvironment: () => ProviderMode.TEST,
  reconcileOnvoPaymentIntent: reconcileMock,
}));

import { createSinpePayment } from "@/server/payments/onvo/create-sinpe-payment";

const input = {
  planCode: "STUDENT_MONTHLY",
  levelId: "level_7",
  checkoutRequestId: "e07d8f08-8097-4a76-9d7a-e7306ca87f80",
  mobileNumber: "+50688888888",
  identificationType: 0,
  identification: "01-1234-5678",
} satisfies StartSinpePaymentInput;

const student = {
  id: "user_student",
  name: "Student Test",
  email: "student@example.com",
  emailVerified: true,
  role: Role.STUDENT,
};

function localPayment() {
  return {
    id: "payment_1",
    userId: student.id,
    levelId: input.levelId,
    planCode: PlanCode.STUDENT_MONTHLY,
    product: SubscriptionProduct.STUDENT_PREMIUM,
    billingInterval: BillingInterval.MONTHLY,
    durationMonths: 1,
    roleAtCheckout: Role.STUDENT,
    expectedAmountMinor: 350_000,
    currency: "CRC",
    providerMode: ProviderMode.TEST,
    providerPaymentIntentId: null as string | null,
    providerPaymentMethodId: null as string | null,
    internalReference: "EDUNIVEL-test",
    checkoutRequestId: input.checkoutRequestId,
    status: PaymentStatus.INITIALIZING as PaymentStatus,
  };
}

describe("createSinpePayment authorization and checkout ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ONVO_ENV = "test";
    requireUserMock.mockResolvedValue(student);
    rateLimitMock.mockResolvedValue(undefined);
    paymentFindUniqueMock.mockResolvedValue(null);
    paymentFindUniqueOrThrowMock.mockResolvedValue(localPayment());
    paymentFindFirstMock.mockResolvedValue(null);
    paymentUpdateManyMock.mockResolvedValue({ count: 1 });
    levelFindUniqueMock.mockResolvedValue({
      id: input.levelId,
      levelNumber: 7,
      isActive: true,
      requiresSubscription: true,
    });
  });

  it.each([
    [Role.ADMIN, "STUDENT_MONTHLY"],
    [Role.COLLABORATOR, "TEACHER_MONTHLY"],
  ])("rejects the ineligible role %s before creating a payment", async (role, planCode) => {
    requireUserMock.mockResolvedValue({ ...student, role });

    await expect(
      createSinpePayment({ ...input, planCode } as StartSinpePaymentInput),
    ).rejects.toMatchObject({
      code: "ROLE_NOT_ALLOWED",
    });
    expect(paymentCreateMock).not.toHaveBeenCalled();
    expect(createIntentMock).not.toHaveBeenCalled();
  });

  it.each([
    [Role.STUDENT, "TEACHER_MONTHLY"],
    [Role.TEACHER, "STUDENT_YEARLY"],
  ])("rejects a plan that does not match role %s", async (role, planCode) => {
    requireUserMock.mockResolvedValue({ ...student, role });

    await expect(
      createSinpePayment({ ...input, planCode } as StartSinpePaymentInput),
    ).rejects.toMatchObject({
      code: "PLAN_NOT_ALLOWED",
    });
    expect(paymentCreateMock).not.toHaveBeenCalled();
    expect(createIntentMock).not.toHaveBeenCalled();
  });

  it("rejects a checkoutRequestId that already belongs to another user", async () => {
    paymentFindUniqueMock.mockResolvedValue({
      ...localPayment(),
      userId: "user_other",
    });

    await expect(createSinpePayment(input)).rejects.toMatchObject({
      code: "CHECKOUT_REQUEST_CONFLICT",
    });
    expect(paymentCreateMock).not.toHaveBeenCalled();
    expect(createIntentMock).not.toHaveBeenCalled();
  });

  it("returns the same user's existing checkout without creating another ONVO intent", async () => {
    const existing = localPayment();
    paymentFindUniqueMock.mockResolvedValue(existing);

    await expect(createSinpePayment(input)).resolves.toBe(existing);
    expect(paymentCreateMock).not.toHaveBeenCalled();
    expect(createIntentMock).not.toHaveBeenCalled();
  });

  it("reuses an open payment for the same user and level", async () => {
    const openPayment = localPayment();
    paymentFindFirstMock.mockResolvedValue(openPayment);

    await expect(createSinpePayment(input)).resolves.toBe(openPayment);
    expect(paymentCreateMock).not.toHaveBeenCalled();
    expect(createIntentMock).not.toHaveBeenCalled();
  });

  it("builds amount, product and duration from the server-side catalog", async () => {
    let persisted = localPayment();
    paymentCreateMock.mockImplementation(({ data }) => {
      persisted = { ...persisted, ...data };
      return Promise.resolve(persisted);
    });
    createIntentMock.mockResolvedValue({
      id: "intent_1",
      status: "requires_payment_method",
    });
    createMethodMock.mockResolvedValue({ id: "method_1" });
    confirmIntentMock.mockResolvedValue({
      id: "intent_1",
      status: "processing",
      receivedAmount: 0,
    });
    paymentFindUniqueOrThrowMock.mockImplementation(() =>
      Promise.resolve(persisted),
    );
    paymentUpdateManyMock.mockImplementation(({ data }) => {
      persisted = { ...persisted, ...data };
      return Promise.resolve({ count: 1 });
    });

    await createSinpePayment(input);

    expect(paymentCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: student.id,
        levelId: input.levelId,
        planCode: PlanCode.STUDENT_MONTHLY,
        product: SubscriptionProduct.STUDENT_PREMIUM,
        billingInterval: BillingInterval.MONTHLY,
        durationMonths: 1,
        roleAtCheckout: Role.STUDENT,
        expectedAmountMinor: 350_000,
        currency: "CRC",
      }),
    });
    expect(createIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 350_000,
        currency: "CRC",
        metadata: expect.objectContaining({
          userId: student.id,
          planCode: PlanCode.STUDENT_MONTHLY,
          levelId: input.levelId,
        }),
      }),
    );
  });

  it("does not downgrade a payment applied by a concurrent webhook", async () => {
    let persisted = localPayment() as ReturnType<typeof localPayment> & {
      appliedAt?: Date | null;
    };
    paymentCreateMock.mockResolvedValue(persisted);
    paymentFindUniqueOrThrowMock.mockImplementation(() =>
      Promise.resolve(persisted),
    );
    paymentUpdateManyMock.mockImplementation(({ data }) => {
      if (data.status === PaymentStatus.PROCESSING) {
        persisted = {
          ...persisted,
          status: PaymentStatus.SUCCEEDED,
          appliedAt: new Date("2026-09-12T12:00:00.000Z"),
        };
        return Promise.resolve({ count: 0 });
      }
      persisted = { ...persisted, ...data };
      return Promise.resolve({ count: 1 });
    });
    createIntentMock.mockResolvedValue({
      id: "intent_1",
      status: "requires_payment_method",
    });
    createMethodMock.mockResolvedValue({ id: "method_1" });
    confirmIntentMock.mockResolvedValue({
      id: "intent_1",
      status: "processing",
      receivedAmount: 0,
    });

    await expect(createSinpePayment(input)).resolves.toMatchObject({
      status: PaymentStatus.SUCCEEDED,
      appliedAt: expect.any(Date),
    });
    expect(reconcileMock).not.toHaveBeenCalled();
    expect(paymentUpdateManyMock).toHaveBeenLastCalledWith({
      where: expect.objectContaining({
        id: persisted.id,
        appliedAt: null,
        status: {
          in: [PaymentStatus.INITIALIZING, PaymentStatus.PROCESSING],
        },
      }),
      data: expect.objectContaining({ status: PaymentStatus.PROCESSING }),
    });
  });

  it("keeps an ambiguous ONVO 500 blocked for reconciliation", async () => {
    const persisted = localPayment();
    paymentCreateMock.mockResolvedValue(persisted);
    paymentFindUniqueOrThrowMock.mockResolvedValue(persisted);
    createIntentMock.mockRejectedValue(new MockOnvoApiError(500, null));

    await expect(createSinpePayment(input)).rejects.toMatchObject({
      code: "PAYMENT_INITIALIZATION_FAILED",
    });
    expect(paymentUpdateManyMock).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: persisted.id, appliedAt: null }),
      data: expect.objectContaining({
        status: PaymentStatus.REQUIRES_REVIEW,
        errorCode: "ONVO_INITIALIZATION_UNCERTAIN",
      }),
    });
  });

  it("marks a definitive ONVO validation rejection as failed", async () => {
    const persisted = localPayment();
    paymentCreateMock.mockResolvedValue(persisted);
    paymentFindUniqueOrThrowMock.mockResolvedValue(persisted);
    createIntentMock.mockRejectedValue(
      new MockOnvoApiError(400, "invalid_request"),
    );

    await expect(createSinpePayment(input)).rejects.toMatchObject({
      code: "PAYMENT_INITIALIZATION_FAILED",
    });
    expect(paymentUpdateManyMock).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: persisted.id, appliedAt: null }),
      data: expect.objectContaining({
        status: PaymentStatus.FAILED,
        errorCode: "invalid_request",
      }),
    });
  });
});

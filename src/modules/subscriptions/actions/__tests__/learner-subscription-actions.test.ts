import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import { initialLearnerCheckoutActionState } from "@/modules/subscriptions/types/learner-checkout-action-state";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  subscriptionFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  createSinpePayment: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: {
      findFirst: mocks.subscriptionFindFirst,
      findUnique: mocks.subscriptionFindUnique,
    },
    user: { update: mocks.userUpdate },
  },
}));
vi.mock("@/server/payments/onvo/create-sinpe-payment", () => ({
  createSinpePayment: mocks.createSinpePayment,
  SinpeCheckoutError: class SinpeCheckoutError extends Error {},
}));

import {
  selectStudentSubscriptionLevelAction,
  selectTeacherSubscriptionLevelAction,
  startStudentNewSubscriptionAction,
  startStudentRenewalAction,
  startTeacherNewSubscriptionAction,
  startTeacherRenewalAction,
} from "@/modules/subscriptions/actions/learner-subscription-actions";

function validCheckoutForm(planCode = "STUDENT_MONTHLY") {
  const formData = new FormData();
  formData.set("planCode", planCode);
  formData.set(
    "checkoutRequestId",
    "e07d8f08-8097-4a76-9d7a-e7306ca87f80",
  );
  formData.set("mobileNumber", "88888888");
  formData.set("identificationType", "0");
  formData.set("identification", "01-1393-1919");
  return formData;
}

describe("Learner subscription actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    mocks.requireRole.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      emailVerified: true,
    });
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    mocks.userUpdate.mockResolvedValue({ id: "student-1" });
    mocks.createSinpePayment.mockResolvedValue({ id: "payment-1" });
  });

  it("does not sell a level again through the new-subscription flow", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({ id: "sub-7" });
    const formData = validCheckoutForm();
    formData.set("levelId", "level-7");

    await expect(
      startStudentNewSubscriptionAction(
        initialLearnerCheckoutActionState,
        formData,
      ),
    ).resolves.toMatchObject({
      status: "error",
      code: "LEVEL_ALREADY_OWNED",
      values: { levelId: "level-7", planCode: "STUDENT_MONTHLY" },
    });
    expect(mocks.subscriptionFindUnique).toHaveBeenCalledWith({
      where: {
        userId_levelId: { userId: "student-1", levelId: "level-7" },
      },
      select: { id: true },
    });
    expect(mocks.createSinpePayment).not.toHaveBeenCalled();
  });

  it("rejects renewal of another user's subscription", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue(null);
    const formData = validCheckoutForm();
    formData.set("subscriptionId", "foreign-subscription");

    await expect(
      startStudentRenewalAction(initialLearnerCheckoutActionState, formData),
    ).resolves.toMatchObject({
      status: "error",
      code: "SUBSCRIPTION_NOT_FOUND",
    });
    expect(mocks.subscriptionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "foreign-subscription", userId: "student-1" },
      }),
    );
    expect(mocks.createSinpePayment).not.toHaveBeenCalled();
  });

  it("derives the renewal level from the owned subscription on the server", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue({
      levelId: "owned-level-8",
      product: SubscriptionProduct.STUDENT_PREMIUM,
      level: { isActive: true, requiresSubscription: true },
    });
    const formData = validCheckoutForm();
    formData.set("subscriptionId", "sub-8");
    formData.set("levelId", "tampered-level-9");

    await expect(
      startStudentRenewalAction(initialLearnerCheckoutActionState, formData),
    ).rejects.toThrow("REDIRECT:/dashboard/subscription/payments/payment-1");
    expect(mocks.createSinpePayment).toHaveBeenCalledWith({
      planCode: "STUDENT_MONTHLY",
      levelId: "owned-level-8",
      checkoutRequestId: "e07d8f08-8097-4a76-9d7a-e7306ca87f80",
      mobileNumber: "+50688888888",
      identificationType: 0,
      identification: "01-1393-1919",
    });
  });

  it("does not expose or select a subscription owned by another user", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("subscriptionId", "foreign-subscription");

    await expect(selectStudentSubscriptionLevelAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard/subscription",
    );
    expect(mocks.subscriptionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "foreign-subscription", userId: "student-1" },
      }),
    );
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("selects a level only when the owned subscription has valid paid access", async () => {
    mocks.subscriptionFindFirst.mockResolvedValue({
      id: "sub-7",
      product: SubscriptionProduct.STUDENT_PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date("2020-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
      level: { id: "level-7", isActive: true },
      payments: [{ id: "payment-7" }],
    });
    const formData = new FormData();
    formData.set("subscriptionId", "sub-7");

    await expect(selectStudentSubscriptionLevelAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard/student",
    );
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { selectedLevelId: "level-7" },
    });
  });

  it("renews a teacher's own level with the teacher plan", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      role: Role.TEACHER,
      emailVerified: true,
    });
    mocks.subscriptionFindFirst.mockResolvedValue({
      levelId: "owned-level-9",
      product: SubscriptionProduct.TEACHER_PREMIUM,
      level: { isActive: true, requiresSubscription: true },
    });
    const formData = validCheckoutForm("TEACHER_YEARLY");
    formData.set("subscriptionId", "teacher-sub-9");

    await expect(
      startTeacherRenewalAction(initialLearnerCheckoutActionState, formData),
    ).rejects.toThrow("REDIRECT:/dashboard/subscription/payments/payment-1");
    expect(mocks.requireRole).toHaveBeenCalledWith(Role.TEACHER);
    expect(mocks.createSinpePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        planCode: "TEACHER_YEARLY",
        levelId: "owned-level-9",
      }),
    );
  });

  it("starts a new teacher subscription with teacher ownership checks", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      role: Role.TEACHER,
      emailVerified: true,
    });
    const formData = validCheckoutForm("TEACHER_MONTHLY");
    formData.set("levelId", "level-10");

    await expect(
      startTeacherNewSubscriptionAction(
        initialLearnerCheckoutActionState,
        formData,
      ),
    ).rejects.toThrow("REDIRECT:/dashboard/subscription/payments/payment-1");
    expect(mocks.requireRole).toHaveBeenCalledWith(Role.TEACHER);
    expect(mocks.subscriptionFindUnique).toHaveBeenCalledWith({
      where: {
        userId_levelId: { userId: "teacher-1", levelId: "level-10" },
      },
      select: { id: true },
    });
    expect(mocks.createSinpePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        planCode: "TEACHER_MONTHLY",
        levelId: "level-10",
      }),
    );
  });

  it("returns field errors without echoing SINPE payer data", async () => {
    const formData = validCheckoutForm();
    formData.set("levelId", "");
    formData.set("mobileNumber", "+506123");
    formData.set("identification", "sensitive-invalid-value");

    const result = await startStudentNewSubscriptionAction(
      initialLearnerCheckoutActionState,
      formData,
    );

    expect(result).toMatchObject({
      status: "error",
      code: "INVALID_PAYMENT_DATA",
      fieldErrors: {
        levelId: expect.any(Array),
        mobileNumber: expect.any(Array),
        identification: expect.any(Array),
      },
      values: {
        levelId: "",
        planCode: "STUDENT_MONTHLY",
      },
    });
    expect(JSON.stringify(result)).not.toContain("+506123");
    expect(JSON.stringify(result)).not.toContain("sensitive-invalid-value");
    expect(mocks.createSinpePayment).not.toHaveBeenCalled();
  });

  it("does not renew a student product from a teacher account", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      role: Role.TEACHER,
      emailVerified: true,
    });
    mocks.subscriptionFindFirst.mockResolvedValue({
      levelId: "level-7",
      product: SubscriptionProduct.STUDENT_PREMIUM,
      level: { isActive: true, requiresSubscription: true },
    });
    const formData = validCheckoutForm("TEACHER_MONTHLY");
    formData.set("subscriptionId", "mismatched-subscription");

    await expect(
      startTeacherRenewalAction(initialLearnerCheckoutActionState, formData),
    ).resolves.toMatchObject({
      status: "error",
      code: "SUBSCRIPTION_NOT_RENEWABLE",
    });
    expect(mocks.createSinpePayment).not.toHaveBeenCalled();
  });

  it("selects a teacher level only with confirmed teacher access", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      role: Role.TEACHER,
      emailVerified: true,
    });
    mocks.subscriptionFindFirst.mockResolvedValue({
      id: "teacher-sub-9",
      product: SubscriptionProduct.TEACHER_PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date("2020-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2999-01-01T00:00:00.000Z"),
      level: { id: "level-9", isActive: true },
      payments: [{ id: "teacher-payment-9" }],
    });
    const formData = new FormData();
    formData.set("subscriptionId", "teacher-sub-9");

    await expect(selectTeacherSubscriptionLevelAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard/teacher",
    );
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "teacher-1" },
      data: { selectedLevelId: "level-9" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/dashboard/teacher",
      "layout",
    );
  });
});

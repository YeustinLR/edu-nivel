"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  PaymentStatus,
  Role,
} from "@/generated/prisma/enums";
import {
  startSinpePaymentSchema,
  startLearnerRenewalPaymentSchema,
} from "@/modules/payments/schemas/start-sinpe-payment.schema";
import {
  evaluatePremiumAccess,
  getRequiredSubscriptionProduct,
} from "@/modules/subscriptions/domain/premium-access";
import { isSubscriptionPlanCode } from "@/modules/subscriptions/config/plan-catalog";
import type { LearnerSubscriptionRole } from "@/modules/subscriptions/types/learner-subscription";
import {
  learnerCheckoutErrorMessages,
  type LearnerCheckoutActionState,
  type LearnerCheckoutFieldErrors,
  type LearnerCheckoutSafeValues,
} from "@/modules/subscriptions/types/learner-checkout-action-state";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import {
  createSinpePayment,
  SinpeCheckoutError,
} from "@/server/payments/onvo/create-sinpe-payment";

function checkoutErrorCode(error: unknown) {
  return error instanceof SinpeCheckoutError
    ? error.code
    : "PAYMENT_INITIALIZATION_FAILED";
}

function safeCheckoutValues(formData: FormData): LearnerCheckoutSafeValues {
  const planCode = formData.get("planCode");
  const levelId = formData.get("levelId");
  const subscriptionId = formData.get("subscriptionId");
  const checkoutRequestId = formData.get("checkoutRequestId");

  return {
    checkoutRequestId:
      typeof checkoutRequestId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        checkoutRequestId,
      )
        ? checkoutRequestId
        : randomUUID(),
    planCode:
      typeof planCode === "string" && isSubscriptionPlanCode(planCode)
        ? planCode
        : undefined,
    levelId:
      typeof levelId === "string" && levelId.length <= 100
        ? levelId
        : undefined,
    subscriptionId:
      typeof subscriptionId === "string" && subscriptionId.length <= 100
        ? subscriptionId
        : undefined,
  };
}

function checkoutError(
  previousState: LearnerCheckoutActionState,
  values: LearnerCheckoutSafeValues,
  code: string,
  fieldErrors?: LearnerCheckoutFieldErrors,
): LearnerCheckoutActionState {
  return {
    status: "error",
    revision: previousState.revision + 1,
    code,
    message:
      learnerCheckoutErrorMessages[code] ?? "No fue posible preparar el pago.",
    fieldErrors,
    values,
  };
}

function logCheckoutValidationIssues(
  flow: "new" | "renew",
  issues: Array<{ path: PropertyKey[]; code: string }>,
) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(
    JSON.stringify({
      scope: "subscription-checkout-validation",
      flow,
      fields: [
        ...new Set(issues.map((issue) => String(issue.path[0] ?? "form"))),
      ],
      codes: [...new Set(issues.map((issue) => issue.code))],
    }),
  );
}

function roleDashboardPath(role: LearnerSubscriptionRole) {
  return role === Role.STUDENT
    ? "/dashboard/student"
    : "/dashboard/teacher";
}

async function startNewSubscription(
  previousState: LearnerCheckoutActionState,
  formData: FormData,
  role: LearnerSubscriptionRole,
): Promise<LearnerCheckoutActionState> {
  const values = safeCheckoutValues(formData);
  const parsed = startSinpePaymentSchema.safeParse({
    planCode: formData.get("planCode"),
    levelId: formData.get("levelId"),
    checkoutRequestId: formData.get("checkoutRequestId"),
    mobileNumber: formData.get("mobileNumber"),
    identificationType: formData.get("identificationType"),
    identification: formData.get("identification"),
  });

  if (!parsed.success) {
    logCheckoutValidationIssues("new", parsed.error.issues);
    const errors = parsed.error.flatten().fieldErrors;
    return checkoutError(previousState, values, "INVALID_PAYMENT_DATA", {
      levelId: errors.levelId,
      planCode: errors.planCode,
      mobileNumber: errors.mobileNumber,
      identificationType: errors.identificationType,
      identification: errors.identification,
    });
  }

  const user = await requireRole(role);
  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      userId_levelId: { userId: user.id, levelId: parsed.data.levelId },
    },
    select: { id: true },
  });
  if (existingSubscription) {
    return checkoutError(previousState, values, "LEVEL_ALREADY_OWNED", {
      levelId: [learnerCheckoutErrorMessages.LEVEL_ALREADY_OWNED],
    });
  }

  let paymentId: string;
  try {
    const payment = await createSinpePayment(parsed.data);
    paymentId = payment.id;
  } catch (error) {
    const code = checkoutErrorCode(error);
    return checkoutError(previousState, values, code);
  }
  redirect(`/dashboard/subscription/payments/${encodeURIComponent(paymentId)}`);
}

async function startRenewal(
  previousState: LearnerCheckoutActionState,
  formData: FormData,
  role: LearnerSubscriptionRole,
): Promise<LearnerCheckoutActionState> {
  const values = safeCheckoutValues(formData);
  const parsed = startLearnerRenewalPaymentSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    planCode: formData.get("planCode"),
    checkoutRequestId: formData.get("checkoutRequestId"),
    mobileNumber: formData.get("mobileNumber"),
    identificationType: formData.get("identificationType"),
    identification: formData.get("identification"),
  });

  if (!parsed.success) {
    logCheckoutValidationIssues("renew", parsed.error.issues);
    const errors = parsed.error.flatten().fieldErrors;
    return checkoutError(previousState, values, "INVALID_PAYMENT_DATA", {
      planCode: errors.planCode,
      mobileNumber: errors.mobileNumber,
      identificationType: errors.identificationType,
      identification: errors.identification,
    });
  }

  const user = await requireRole(role);
  const expectedProduct = getRequiredSubscriptionProduct(role);
  const subscription = await prisma.subscription.findFirst({
    where: { id: parsed.data.subscriptionId, userId: user.id },
    select: {
      levelId: true,
      product: true,
      level: { select: { isActive: true, requiresSubscription: true } },
    },
  });

  if (!subscription) {
    return checkoutError(previousState, values, "SUBSCRIPTION_NOT_FOUND");
  }
  if (
    !expectedProduct ||
    subscription.product !== expectedProduct ||
    !subscription.level.isActive ||
    !subscription.level.requiresSubscription
  ) {
    return checkoutError(previousState, values, "SUBSCRIPTION_NOT_RENEWABLE");
  }

  let paymentId: string;
  try {
    const payment = await createSinpePayment({
      planCode: parsed.data.planCode,
      levelId: subscription.levelId,
      checkoutRequestId: parsed.data.checkoutRequestId,
      mobileNumber: parsed.data.mobileNumber,
      identificationType: parsed.data.identificationType,
      identification: parsed.data.identification,
    });
    paymentId = payment.id;
  } catch (error) {
    return checkoutError(previousState, values, checkoutErrorCode(error));
  }
  redirect(`/dashboard/subscription/payments/${encodeURIComponent(paymentId)}`);
}

async function selectSubscriptionLevel(
  formData: FormData,
  role: LearnerSubscriptionRole,
) {
  const user = await requireRole(role);
  const subscriptionId = formData.get("subscriptionId");
  if (typeof subscriptionId !== "string" || !subscriptionId) {
    redirect("/dashboard/subscription");
  }

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId: user.id },
    include: {
      level: { select: { id: true, isActive: true } },
      payments: {
        where: { status: PaymentStatus.SUCCEEDED, appliedAt: { not: null } },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!subscription?.level.isActive) {
    redirect("/dashboard/subscription");
  }

  const decision = evaluatePremiumAccess({
    role: user.role,
    emailVerified: user.emailVerified,
    subscription: {
      product: subscription.product,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      hasConfirmedPayment: subscription.payments.length > 0,
    },
  });
  if (!decision.allowed) {
    redirect("/dashboard/subscription");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { selectedLevelId: subscription.level.id },
  });
  revalidatePath(roleDashboardPath(role), "layout");
  revalidatePath("/dashboard/subscription");
  redirect(roleDashboardPath(role));
}

export async function startStudentNewSubscriptionAction(
  previousState: LearnerCheckoutActionState,
  formData: FormData,
) {
  return startNewSubscription(previousState, formData, Role.STUDENT);
}

export async function startTeacherNewSubscriptionAction(
  previousState: LearnerCheckoutActionState,
  formData: FormData,
) {
  return startNewSubscription(previousState, formData, Role.TEACHER);
}

export async function startStudentRenewalAction(
  previousState: LearnerCheckoutActionState,
  formData: FormData,
) {
  return startRenewal(previousState, formData, Role.STUDENT);
}

export async function startTeacherRenewalAction(
  previousState: LearnerCheckoutActionState,
  formData: FormData,
) {
  return startRenewal(previousState, formData, Role.TEACHER);
}

export async function selectStudentSubscriptionLevelAction(
  formData: FormData,
) {
  return selectSubscriptionLevel(formData, Role.STUDENT);
}

export async function selectTeacherSubscriptionLevelAction(
  formData: FormData,
) {
  return selectSubscriptionLevel(formData, Role.TEACHER);
}

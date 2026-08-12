"use server";

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
import type { LearnerSubscriptionRole } from "@/modules/subscriptions/types/learner-subscription";
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

function roleDashboardPath(role: LearnerSubscriptionRole) {
  return role === Role.STUDENT
    ? "/dashboard/student"
    : "/dashboard/teacher";
}

async function startNewSubscription(
  formData: FormData,
  role: LearnerSubscriptionRole,
) {
  const parsed = startSinpePaymentSchema.safeParse({
    planCode: formData.get("planCode"),
    levelId: formData.get("levelId"),
    checkoutRequestId: formData.get("checkoutRequestId"),
    mobileNumber: formData.get("mobileNumber"),
    identificationType: formData.get("identificationType"),
    identification: formData.get("identification"),
  });

  if (!parsed.success) {
    redirect("/dashboard/subscription/new?error=INVALID_PAYMENT_DATA");
  }

  const user = await requireRole(role);
  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      userId_levelId: { userId: user.id, levelId: parsed.data.levelId },
    },
    select: { id: true },
  });
  if (existingSubscription) {
    redirect("/dashboard/subscription/new?error=LEVEL_ALREADY_OWNED");
  }

  let paymentId: string;
  try {
    const payment = await createSinpePayment(parsed.data);
    paymentId = payment.id;
  } catch (error) {
    redirect(
      `/dashboard/subscription/new?error=${encodeURIComponent(checkoutErrorCode(error))}`,
    );
  }
  redirect(`/dashboard/subscription/payments/${encodeURIComponent(paymentId)}`);
}

async function startRenewal(
  formData: FormData,
  role: LearnerSubscriptionRole,
) {
  const parsed = startLearnerRenewalPaymentSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    planCode: formData.get("planCode"),
    checkoutRequestId: formData.get("checkoutRequestId"),
    mobileNumber: formData.get("mobileNumber"),
    identificationType: formData.get("identificationType"),
    identification: formData.get("identification"),
  });

  if (!parsed.success) {
    redirect("/dashboard/subscription?error=INVALID_PAYMENT_DATA");
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
    redirect("/dashboard/subscription?error=SUBSCRIPTION_NOT_FOUND");
  }
  if (
    !expectedProduct ||
    subscription.product !== expectedProduct ||
    !subscription.level.isActive ||
    !subscription.level.requiresSubscription
  ) {
    redirect("/dashboard/subscription?error=SUBSCRIPTION_NOT_RENEWABLE");
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
    redirect(
      `/dashboard/subscription/renew/${encodeURIComponent(parsed.data.subscriptionId)}?error=${encodeURIComponent(checkoutErrorCode(error))}`,
    );
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

export async function startStudentNewSubscriptionAction(formData: FormData) {
  return startNewSubscription(formData, Role.STUDENT);
}

export async function startTeacherNewSubscriptionAction(formData: FormData) {
  return startNewSubscription(formData, Role.TEACHER);
}

export async function startStudentRenewalAction(formData: FormData) {
  return startRenewal(formData, Role.STUDENT);
}

export async function startTeacherRenewalAction(formData: FormData) {
  return startRenewal(formData, Role.TEACHER);
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

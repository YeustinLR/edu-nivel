import {
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/client";

export type PremiumAccessDenialCode =
  | "ROLE_NOT_ELIGIBLE"
  | "EMAIL_NOT_VERIFIED"
  | "SUBSCRIPTION_REQUIRED"
  | "SUBSCRIPTION_INACTIVE"
  | "SUBSCRIPTION_NOT_STARTED"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_PRODUCT_MISMATCH"
  | "SUBSCRIPTION_PAYMENT_UNCONFIRMED";

export type PremiumAccessDecision =
  | { allowed: true }
  | { allowed: false; code: PremiumAccessDenialCode };

type PremiumSubscriptionSnapshot = {
  product: SubscriptionProduct;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  hasConfirmedPayment: boolean;
};

type EvaluatePremiumAccessInput = {
  role: Role;
  emailVerified: boolean;
  subscription: PremiumSubscriptionSnapshot | null;
  now?: Date;
};

export function getRequiredSubscriptionProduct(
  role: Role,
): SubscriptionProduct | null {
  if (role === Role.STUDENT) {
    return SubscriptionProduct.STUDENT_PREMIUM;
  }

  if (role === Role.TEACHER) {
    return SubscriptionProduct.TEACHER_PREMIUM;
  }

  return null;
}

export function evaluatePremiumAccess({
  role,
  emailVerified,
  subscription,
  now = new Date(),
}: EvaluatePremiumAccessInput): PremiumAccessDecision {
  const requiredProduct = getRequiredSubscriptionProduct(role);

  if (!requiredProduct) {
    return { allowed: false, code: "ROLE_NOT_ELIGIBLE" };
  }

  if (!emailVerified) {
    return { allowed: false, code: "EMAIL_NOT_VERIFIED" };
  }

  if (!subscription) {
    return { allowed: false, code: "SUBSCRIPTION_REQUIRED" };
  }

  if (subscription.product !== requiredProduct) {
    return { allowed: false, code: "SUBSCRIPTION_PRODUCT_MISMATCH" };
  }

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    return { allowed: false, code: "SUBSCRIPTION_INACTIVE" };
  }

  if (subscription.currentPeriodStart > now) {
    return { allowed: false, code: "SUBSCRIPTION_NOT_STARTED" };
  }

  if (subscription.currentPeriodEnd <= now) {
    return { allowed: false, code: "SUBSCRIPTION_EXPIRED" };
  }

  if (!subscription.hasConfirmedPayment) {
    return { allowed: false, code: "SUBSCRIPTION_PAYMENT_UNCONFIRMED" };
  }

  return { allowed: true };
}


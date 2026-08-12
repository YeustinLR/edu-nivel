export const SUBSCRIPTION_PLAN_CODES = [
  "STUDENT_MONTHLY",
  "STUDENT_YEARLY",
  "TEACHER_MONTHLY",
  "TEACHER_YEARLY",
] as const;

export type SubscriptionPlanCode = (typeof SUBSCRIPTION_PLAN_CODES)[number];
export type SubscriptionProduct = "STUDENT_PREMIUM" | "TEACHER_PREMIUM";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type SubscriberRole = "STUDENT" | "TEACHER";

export type SubscriptionPlanDefinition = {
  code: SubscriptionPlanCode;
  product: SubscriptionProduct;
  billingInterval: BillingInterval;
  requiredRole: SubscriberRole;
  amountMinor: number;
  currency: "CRC";
  durationMonths: number;
};

export const SUBSCRIPTION_PLAN_CATALOG = {
  STUDENT_MONTHLY: {
    code: "STUDENT_MONTHLY",
    product: "STUDENT_PREMIUM",
    billingInterval: "MONTHLY",
    requiredRole: "STUDENT",
    amountMinor: 350_000,
    currency: "CRC",
    durationMonths: 1,
  },
  STUDENT_YEARLY: {
    code: "STUDENT_YEARLY",
    product: "STUDENT_PREMIUM",
    billingInterval: "YEARLY",
    requiredRole: "STUDENT",
    amountMinor: 3_360_000,
    currency: "CRC",
    durationMonths: 12,
  },
  TEACHER_MONTHLY: {
    code: "TEACHER_MONTHLY",
    product: "TEACHER_PREMIUM",
    billingInterval: "MONTHLY",
    requiredRole: "TEACHER",
    amountMinor: 650_000,
    currency: "CRC",
    durationMonths: 1,
  },
  TEACHER_YEARLY: {
    code: "TEACHER_YEARLY",
    product: "TEACHER_PREMIUM",
    billingInterval: "YEARLY",
    requiredRole: "TEACHER",
    amountMinor: 6_240_000,
    currency: "CRC",
    durationMonths: 12,
  },
} as const satisfies Record<SubscriptionPlanCode, SubscriptionPlanDefinition>;

export function isSubscriptionPlanCode(
  value: string,
): value is SubscriptionPlanCode {
  return SUBSCRIPTION_PLAN_CODES.some((code) => code === value);
}

export function getSubscriptionPlan(
  code: string,
): SubscriptionPlanDefinition | null {
  if (!isSubscriptionPlanCode(code)) {
    return null;
  }

  return SUBSCRIPTION_PLAN_CATALOG[code];
}

export function getSubscriptionPlansForRole(role: SubscriberRole) {
  return Object.values(SUBSCRIPTION_PLAN_CATALOG).filter(
    (plan) => plan.requiredRole === role,
  );
}

export function amountMinorToCRC(amountMinor: number): number {
  return amountMinor / 100;
}

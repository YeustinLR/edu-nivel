import { randomUUID } from "node:crypto";

import { notFound, redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { getDashboardPathForRole } from "@/modules/auth/lib/dashboard-path";
import {
  startStudentRenewalAction,
  startTeacherRenewalAction,
} from "@/modules/subscriptions/actions/learner-subscription-actions";
import { LearnerSubscriptionCheckout } from "@/modules/subscriptions/components/LearnerSubscriptionCheckout";
import {
  getSubscriptionPlan,
  type SubscriptionPlanCode,
} from "@/modules/subscriptions/config/plan-catalog";
import { requireUser } from "@/server/auth/guards";
import { getLearnerRenewalSubscription } from "@/server/subscriptions/learner-subscription-queries";

export default async function RenewLearnerSubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ subscriptionId }, { error }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  if (user.role !== Role.STUDENT && user.role !== Role.TEACHER) {
    redirect(getDashboardPathForRole(user.role));
  }
  const subscription = await getLearnerRenewalSubscription(
    user.role,
    subscriptionId,
  );
  if (!subscription) notFound();
  if (!subscription.level.isActive || !subscription.level.requiresSubscription) {
    redirect("/dashboard/subscription?error=SUBSCRIPTION_NOT_RENEWABLE");
  }

  const lastPlan = subscription.lastPlanCode
    ? getSubscriptionPlan(subscription.lastPlanCode)
    : null;
  const suggestedPlan: SubscriptionPlanCode =
    lastPlan?.requiredRole === user.role
      ? lastPlan.code
      : user.role === Role.STUDENT
        ? "STUDENT_MONTHLY"
        : "TEACHER_MONTHLY";
  const action =
    user.role === Role.STUDENT
      ? startStudentRenewalAction
      : startTeacherRenewalAction;

  return (
    <LearnerSubscriptionCheckout
      role={user.role}
      mode="renew"
      fixedLevel={subscription.level}
      subscriptionId={subscription.id}
      defaultPlanCode={suggestedPlan}
      checkoutRequestId={randomUUID()}
      error={error}
      action={action}
    />
  );
}

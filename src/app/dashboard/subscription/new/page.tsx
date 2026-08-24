import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { getDashboardPathForRole } from "@/modules/auth/lib/dashboard-path";
import {
  startStudentNewSubscriptionAction,
  startTeacherNewSubscriptionAction,
} from "@/modules/subscriptions/actions/learner-subscription-actions";
import { LearnerSubscriptionCheckout } from "@/modules/subscriptions/components/LearnerSubscriptionCheckout";
import { getSubscriptionPlan } from "@/modules/subscriptions/config/plan-catalog";
import { requireUser } from "@/server/auth/guards";
import { getLearnerAvailableSubscriptionLevels } from "@/server/subscriptions/learner-subscription-queries";

export default async function NewLearnerSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; level?: string; plan?: string }>;
}) {
  const [{ error, level, plan }, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);
  if (user.role !== Role.STUDENT && user.role !== Role.TEACHER) {
    redirect(getDashboardPathForRole(user.role));
  }
  const levels = await getLearnerAvailableSubscriptionLevels(user.role);

  if (levels.length === 0) redirect("/dashboard/subscription");

  const action =
    user.role === Role.STUDENT
      ? startStudentNewSubscriptionAction
      : startTeacherNewSubscriptionAction;
  const requestedPlan = plan ? getSubscriptionPlan(plan) : null;
  const defaultPlanCode =
    requestedPlan?.requiredRole === user.role
      ? requestedPlan.code
      : user.role === Role.STUDENT
        ? "STUDENT_MONTHLY"
        : "TEACHER_MONTHLY";

  return (
    <LearnerSubscriptionCheckout
      role={user.role}
      mode="new"
      levels={levels}
      defaultLevelId={levels.some((item) => item.id === level) ? level : undefined}
      defaultPlanCode={defaultPlanCode}
      checkoutRequestId={randomUUID()}
      error={error}
      action={action}
    />
  );
}

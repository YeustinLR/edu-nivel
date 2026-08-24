import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { getDashboardPathForRole } from "@/modules/auth/lib/dashboard-path";
import { LearnerSubscriptionManager } from "@/modules/subscriptions/components/LearnerSubscriptionManager";
import { requireUser } from "@/server/auth/guards";
import {
  getLearnerSubscriptionOverview,
  normalizeLearnerPaymentHistoryPage,
} from "@/server/subscriptions/learner-subscription-queries";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; paymentPage?: string }>;
}) {
  const [{ error, paymentPage }, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);

  if (user.role !== Role.STUDENT && user.role !== Role.TEACHER) {
    redirect(getDashboardPathForRole(user.role));
  }

  const data = await getLearnerSubscriptionOverview(
    user.role,
    normalizeLearnerPaymentHistoryPage(paymentPage),
  );
  return (
    <LearnerSubscriptionManager
      data={data}
      role={user.role}
      error={error}
    />
  );
}

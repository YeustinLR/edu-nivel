import "server-only";

import {
  PaymentStatus,
  Prisma,
  ProviderMode,
  PublicationStatus,
  Role,
  SubscriptionStatus,
} from "@/generated/prisma/client";
import { env } from "@/config/env";
import {
  buildWeeklyCollectionTrend,
  collectedInPeriod,
  getAdminDashboardPeriods,
  type CollectionEvent,
  type CollectionTrendBucket,
  type DashboardPeriods,
  type MetricComparison,
} from "@/modules/dashboard/domain/admin-dashboard";
import { APPLIED_ACCESS_PAYMENT_STATUSES } from "@/modules/subscriptions/domain/premium-access";
import { providerModeForEnvironment } from "@/modules/payments/domain/provider-mode";
import {
  eligibleUserWhere,
  reminderKey,
  renewalWhere,
} from "@/modules/notifications/domain/notifications";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export type AdminDashboardSummary = {
  viewerName: string;
  generatedAt: Date;
  paymentMode: ProviderMode;
  periods: DashboardPeriods;
  attention: {
    pendingReviews: {
      total: number;
      modules: number;
      resources: number;
      oldestSubmittedAt: Date | null;
    };
    paymentsRequiringReview: number;
    renewalsNeedingReminder: number;
    expiredInvitations: number;
  };
  metrics: {
    collected: MetricComparison;
    paidAccesses: MetricComparison;
    emailVerifications: MetricComparison;
    activeLearners: MetricComparison;
  };
  collectionTrend: CollectionTrendBucket[];
  contentHealth: {
    publishedModules: number;
    publishedResources: number;
    changesRequested: number;
    modulesWithoutPublishedResources: number;
    subjectsWithoutPublishedModules: number;
  };
};

export function dashboardProviderMode(
  onvoEnvironment: "test" | "live" | undefined,
) {
  return providerModeForEnvironment(onvoEnvironment);
}

function paymentAmount(payment: {
  receivedAmountMinor: number | null;
  expectedAmountMinor: number;
}) {
  return payment.receivedAmountMinor ?? payment.expectedAmountMinor;
}

function oldestDate(first: Date | null, second: Date | null) {
  if (!first) return second;
  if (!second) return first;
  return first < second ? first : second;
}

async function countRenewalsNeedingReminder(
  now: Date,
  paymentMode: ProviderMode,
) {
  const pendingPairs = await prisma.payment.findMany({
    where: {
      providerMode: paymentMode,
      status: {
        in: [
          PaymentStatus.INITIALIZING,
          PaymentStatus.PROCESSING,
          PaymentStatus.REQUIRES_REVIEW,
        ],
      },
    },
    distinct: ["userId", "levelId"],
    select: { userId: true, levelId: true },
  });

  const withoutPendingPayment: Prisma.SubscriptionWhereInput = pendingPairs.length
    ? { NOT: { OR: pendingPairs } }
    : {};
  const candidates = await prisma.subscription.findMany({
    where: {
      AND: [renewalWhere(now, paymentMode), withoutPendingPayment],
      payments: {
        some: {
          providerMode: paymentMode,
          status: PaymentStatus.SUCCEEDED,
          appliedAt: { not: null },
        },
      },
    },
    select: { id: true, currentPeriodEnd: true },
  });

  if (candidates.length === 0) return 0;

  const keys = candidates.map((subscription) =>
    reminderKey(subscription.id, subscription.currentPeriodEnd),
  );
  const alreadySent = await prisma.notificationRecipient.count({
    where: { initialReminderKey: { in: keys } },
  });

  return candidates.length - alreadySent;
}

export async function getAdminDashboardSummary(
  now = new Date(),
): Promise<AdminDashboardSummary> {
  const admin = await requireRole(Role.ADMIN);
  const paymentMode = dashboardProviderMode(env.ONVO_ENV);
  const periods = getAdminDashboardPeriods(now);
  const earliestDate = periods.previous30Days.start;
  const activeUserFilter = eligibleUserWhere(now);
  const learnerRoles = [Role.STUDENT, Role.TEACHER];

  const [
    moduleReview,
    resourceReview,
    paymentsRequiringReview,
    renewalsNeedingReminder,
    expiredInvitations,
    paymentRows,
    paidAccesses,
    currentEmailVerifications,
    previousEmailVerifications,
    currentActiveLearners,
    previousActiveLearners,
    publishedModules,
    publishedResources,
    modulesChangesRequested,
    resourcesChangesRequested,
    modulesWithoutPublishedResources,
    subjectsWithoutPublishedModules,
  ] = await Promise.all([
    prisma.module.aggregate({
      where: { publicationStatus: PublicationStatus.IN_REVIEW },
      _count: { _all: true },
      _min: { submittedForReviewAt: true },
    }),
    prisma.resource.aggregate({
      where: { publicationStatus: PublicationStatus.IN_REVIEW },
      _count: { _all: true },
      _min: { submittedForReviewAt: true },
    }),
    prisma.payment.count({
      where: {
        providerMode: paymentMode,
        status: PaymentStatus.REQUIRES_REVIEW,
      },
    }),
    countRenewalsNeedingReminder(now, paymentMode),
    prisma.userInvitation.count({
      where: {
        activeEmail: { not: null },
        acceptedAt: null,
        canceledAt: null,
        expiresAt: { lte: now },
      },
    }),
    prisma.payment.findMany({
      where: {
        providerMode: paymentMode,
        status: PaymentStatus.SUCCEEDED,
        appliedAt: { gte: earliestDate, lt: now },
      },
      select: {
        appliedAt: true,
        receivedAmountMinor: true,
        expectedAmountMinor: true,
      },
    }),
    prisma.subscription.count({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED],
        },
        currentPeriodStart: { lte: now },
        currentPeriodEnd: { gt: now },
        user: activeUserFilter,
        level: { isActive: true, requiresSubscription: true },
        OR: [
          { product: "STUDENT_PREMIUM", user: { role: Role.STUDENT } },
          { product: "TEACHER_PREMIUM", user: { role: Role.TEACHER } },
        ],
        payments: {
          some: {
            providerMode: paymentMode,
            status: { in: [...APPLIED_ACCESS_PAYMENT_STATUSES] },
            appliedAt: { not: null },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        AND: [
          activeUserFilter,
          {
            emailVerifiedAt: {
              gte: periods.current30Days.start,
              lt: periods.current30Days.end,
            },
          },
        ],
        role: { in: learnerRoles },
      },
    }),
    prisma.user.count({
      where: {
        AND: [
          activeUserFilter,
          {
            emailVerifiedAt: {
              gte: periods.previous30Days.start,
              lt: periods.previous30Days.end,
            },
          },
        ],
        role: { in: learnerRoles },
      },
    }),
    prisma.resourceProgress.groupBy({
      by: ["userId"],
      where: {
        lastViewedAt: {
          gte: periods.current7Days.start,
          lt: periods.current7Days.end,
        },
        user: { AND: [activeUserFilter], role: { in: learnerRoles } },
      },
    }),
    prisma.resourceProgress.groupBy({
      by: ["userId"],
      where: {
        lastViewedAt: {
          gte: periods.previous7Days.start,
          lt: periods.previous7Days.end,
        },
        user: { AND: [activeUserFilter], role: { in: learnerRoles } },
      },
    }),
    prisma.module.count({
      where: {
        isActive: true,
        publicationStatus: PublicationStatus.PUBLISHED,
        subject: { isActive: true, level: { isActive: true } },
      },
    }),
    prisma.resource.count({
      where: {
        isActive: true,
        publicationStatus: PublicationStatus.PUBLISHED,
        module: {
          isActive: true,
          publicationStatus: PublicationStatus.PUBLISHED,
          subject: { isActive: true, level: { isActive: true } },
        },
      },
    }),
    prisma.module.count({
      where: { publicationStatus: PublicationStatus.CHANGES_REQUESTED },
    }),
    prisma.resource.count({
      where: { publicationStatus: PublicationStatus.CHANGES_REQUESTED },
    }),
    prisma.module.count({
      where: {
        isActive: true,
        publicationStatus: PublicationStatus.PUBLISHED,
        subject: { isActive: true, level: { isActive: true } },
        resources: {
          none: {
            isActive: true,
            publicationStatus: PublicationStatus.PUBLISHED,
          },
        },
      },
    }),
    prisma.subject.count({
      where: {
        isActive: true,
        level: { isActive: true },
        modules: {
          none: {
            isActive: true,
            publicationStatus: PublicationStatus.PUBLISHED,
          },
        },
      },
    }),
  ]);

  const paymentEvents: CollectionEvent[] = paymentRows.flatMap((payment) =>
    payment.appliedAt
      ? [{ amountMinor: paymentAmount(payment), occurredAt: payment.appliedAt }]
      : [],
  );
  return {
    viewerName: admin.name,
    generatedAt: now,
    paymentMode,
    periods,
    attention: {
      pendingReviews: {
        total: moduleReview._count._all + resourceReview._count._all,
        modules: moduleReview._count._all,
        resources: resourceReview._count._all,
        oldestSubmittedAt: oldestDate(
          moduleReview._min.submittedForReviewAt,
          resourceReview._min.submittedForReviewAt,
        ),
      },
      paymentsRequiringReview,
      renewalsNeedingReminder,
      expiredInvitations,
    },
    metrics: {
      collected: {
        current: collectedInPeriod(paymentEvents, periods.current30Days),
        previous: collectedInPeriod(paymentEvents, periods.previous30Days),
      },
      paidAccesses: { current: paidAccesses, previous: null },
      emailVerifications: {
        current: currentEmailVerifications,
        previous: previousEmailVerifications,
      },
      activeLearners: {
        current: currentActiveLearners.length,
        previous: previousActiveLearners.length,
      },
    },
    collectionTrend: buildWeeklyCollectionTrend(
      paymentEvents,
      periods.current30Days,
    ),
    contentHealth: {
      publishedModules,
      publishedResources,
      changesRequested: modulesChangesRequested + resourcesChangesRequested,
      modulesWithoutPublishedResources,
      subjectsWithoutPublishedModules,
    },
  };
}

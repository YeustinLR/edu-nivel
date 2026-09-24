import "server-only";

import { SubscriptionStatus } from "@/generated/prisma/enums";
import { providerModeForEnvironment } from "@/modules/payments/domain/provider-mode";
import {
  APPLIED_ACCESS_PAYMENT_STATUSES,
  getRequiredSubscriptionProduct,
} from "@/modules/subscriptions/domain/premium-access";
import type { LearnerRole } from "@/modules/dashboard/types/learner-dashboard";
import { prisma } from "@/server/db/prisma";

export type LearnerLevelOption = {
  id: string;
  levelNumber: number;
  description: string | null;
  requiresSubscription: boolean;
  isActive: boolean;
};

export async function getAccessibleLearnerLevels({
  userId,
  role,
  levels,
  now = new Date(),
}: {
  userId: string;
  role: LearnerRole;
  levels: LearnerLevelOption[];
  now?: Date;
}) {
  const product = getRequiredSubscriptionProduct(role);

  if (!product) {
    return levels
      .filter((level) => !level.requiresSubscription)
      .map((level) => ({ ...level, hasFullAccess: true }));
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      product,
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED],
      },
      currentPeriodStart: { lte: now },
      currentPeriodEnd: { gt: now },
      payments: {
        some: {
          providerMode: providerModeForEnvironment(process.env.ONVO_ENV),
          status: { in: [...APPLIED_ACCESS_PAYMENT_STATUSES] },
          appliedAt: { not: null },
        },
      },
    },
    select: {
      levelId: true,
      level: {
        select: {
          id: true,
          levelNumber: true,
          description: true,
          requiresSubscription: true,
          isActive: true,
        },
      },
    },
  });
  const accessiblePaidLevelIds = new Set(
    subscriptions.map((subscription) => subscription.levelId),
  );
  // Los niveles activos son explorables aunque el usuario todavía no tenga
  // suscripción. La autorización del contenido se decide por recurso.
  const visibleLevels = levels.map((level) => ({
    ...level,
    hasFullAccess:
      !level.requiresSubscription || accessiblePaidLevelIds.has(level.id),
  }));
  const visibleLevelIds = new Set(visibleLevels.map((level) => level.id));
  const archivedSubscribedLevels = subscriptions.flatMap(({ level }) =>
    !level.isActive &&
    level.requiresSubscription &&
    !visibleLevelIds.has(level.id)
      ? [{ ...level, hasFullAccess: true }]
      : [],
  );

  return [...visibleLevels, ...archivedSubscribedLevels].sort(
    (left, right) => left.levelNumber - right.levelNumber,
  );
}

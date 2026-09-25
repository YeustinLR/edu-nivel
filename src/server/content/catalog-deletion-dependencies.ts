import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  PaymentStatus,
  SubscriptionStatus,
} from "@/generated/prisma/enums";

export const catalogDeletionDependencyMessage =
  "No puedes eliminar este contenido mientras el nivel tenga suscripciones vigentes o pagos pendientes.";

export function activeSubscriptionWhere(levelId: string, now: Date) {
  return {
    levelId,
    status: {
      in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED],
    },
    currentPeriodEnd: { gt: now },
  } satisfies Prisma.SubscriptionWhereInput;
}

export function unresolvedPaymentWhere(levelId: string) {
  return {
    levelId,
    OR: [
      {
        status: {
          in: [
            PaymentStatus.INITIALIZING,
            PaymentStatus.PROCESSING,
            PaymentStatus.REQUIRES_REVIEW,
          ],
        },
      },
      { status: PaymentStatus.SUCCEEDED, appliedAt: null },
    ],
  } satisfies Prisma.PaymentWhereInput;
}

type DeletionDependencyClient = Pick<
  Prisma.TransactionClient,
  "subscription" | "payment"
>;

export async function getLevelDeletionDependencyCounts(
  client: DeletionDependencyClient,
  levelId: string,
  now = new Date(),
) {
  const [activeSubscriptionCount, unresolvedPaymentCount] = await Promise.all([
    client.subscription.count({
      where: activeSubscriptionWhere(levelId, now),
    }),
    client.payment.count({ where: unresolvedPaymentWhere(levelId) }),
  ]);

  return { activeSubscriptionCount, unresolvedPaymentCount };
}

export function hasLevelDeletionDependencies(counts: {
  activeSubscriptionCount: number;
  unresolvedPaymentCount: number;
}) {
  return (
    counts.activeSubscriptionCount > 0 || counts.unresolvedPaymentCount > 0
  );
}

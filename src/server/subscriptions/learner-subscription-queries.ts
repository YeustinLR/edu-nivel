import "server-only";

import { cache } from "react";

import {
  PaymentStatus,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import { getRequiredSubscriptionProduct } from "@/modules/subscriptions/domain/premium-access";
import type {
  LearnerPendingPaymentItem,
  LearnerSubscriptionCheckoutLevel,
  LearnerSubscriptionEffectiveStatus,
  LearnerSubscriptionItem,
  LearnerSubscriptionOverview,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

const openPaymentStatuses = [
  PaymentStatus.INITIALIZING,
  PaymentStatus.PROCESSING,
  PaymentStatus.REQUIRES_REVIEW,
];

function requiredProduct(role: LearnerSubscriptionRole) {
  const product = getRequiredSubscriptionProduct(role);
  if (!product) {
    throw new Error("El rol no admite suscripciones por nivel.");
  }
  return product;
}

function effectiveStatus(
  subscription: {
    status: SubscriptionStatus;
    product: SubscriptionProduct;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  },
  expectedProduct: SubscriptionProduct,
  hasConfirmedPayment: boolean,
  isLevelActive: boolean,
  now: Date,
): LearnerSubscriptionEffectiveStatus {
  if (subscription.status === SubscriptionStatus.CANCELED) return "CANCELED";
  if (
    subscription.status === SubscriptionStatus.EXPIRED ||
    subscription.currentPeriodEnd <= now
  ) {
    return "EXPIRED";
  }
  if (!isLevelActive) return "INACTIVE";
  if (
    subscription.status === SubscriptionStatus.ACTIVE &&
    subscription.product === expectedProduct &&
    subscription.currentPeriodStart <= now &&
    hasConfirmedPayment
  ) {
    return "ACTIVE";
  }
  return "INACTIVE";
}

export const getLearnerSubscriptionOverview = cache(
  async (
    role: LearnerSubscriptionRole,
  ): Promise<LearnerSubscriptionOverview> => {
    const user = await requireRole(role);
    const product = requiredProduct(role);
    const now = new Date();
    const [subscriptions, pendingPayments, availableLevelCount] =
      await Promise.all([
        prisma.subscription.findMany({
          where: { userId: user.id, product },
          orderBy: [
            { currentPeriodEnd: "desc" },
            { level: { levelNumber: "asc" } },
          ],
          include: {
            level: {
              select: {
                id: true,
                levelNumber: true,
                description: true,
                isActive: true,
                requiresSubscription: true,
              },
            },
            payments: {
              where: {
                status: PaymentStatus.SUCCEEDED,
                appliedAt: { not: null },
              },
              orderBy: { appliedAt: "desc" },
              take: 1,
              select: { id: true },
            },
          },
        }),
        prisma.payment.findMany({
          where: {
            userId: user.id,
            product,
            status: { in: openPaymentStatuses },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            planCode: true,
            status: true,
            expectedAmountMinor: true,
            currency: true,
            createdAt: true,
            level: { select: { levelNumber: true } },
          },
        }),
        prisma.level.count({
          where: {
            isActive: true,
            requiresSubscription: true,
            subscriptions: { none: { userId: user.id } },
            payments: {
              none: {
                userId: user.id,
                status: { in: openPaymentStatuses },
              },
            },
          },
        }),
      ]);

    const items: LearnerSubscriptionItem[] = subscriptions.map(
      (subscription) => {
        const hasConfirmedPayment = subscription.payments.length > 0;
        const status = effectiveStatus(
          subscription,
          product,
          hasConfirmedPayment,
          subscription.level.isActive,
          now,
        );
        return {
          id: subscription.id,
          level: subscription.level,
          persistedStatus: subscription.status,
          effectiveStatus: status,
          currentPeriodStart: subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          lastPlanCode: subscription.lastPlanCode,
          hasConfirmedPayment,
          isSelectedLevel: user.selectedLevelId === subscription.levelId,
          canStudy: status === "ACTIVE" && subscription.level.isActive,
          canRenew:
            subscription.level.isActive &&
            subscription.level.requiresSubscription &&
            subscription.product === product,
        };
      },
    );

    return {
      subscriptions: items,
      pendingPayments: pendingPayments.map((payment) => ({
        id: payment.id,
        levelNumber: payment.level.levelNumber,
        planCode: payment.planCode,
        status: payment.status as LearnerPendingPaymentItem["status"],
        expectedAmountMinor: payment.expectedAmountMinor,
        currency: payment.currency,
        createdAt: payment.createdAt.toISOString(),
        href: `/dashboard/subscription/payments/${encodeURIComponent(payment.id)}`,
      })),
      availableLevelCount,
      activeCount: items.filter((item) => item.effectiveStatus === "ACTIVE")
        .length,
    };
  },
);

export async function getLearnerAvailableSubscriptionLevels(
  role: LearnerSubscriptionRole,
): Promise<LearnerSubscriptionCheckoutLevel[]> {
  const user = await requireRole(role);
  return prisma.level.findMany({
    where: {
      isActive: true,
      requiresSubscription: true,
      subscriptions: { none: { userId: user.id } },
      payments: {
        none: {
          userId: user.id,
          status: { in: openPaymentStatuses },
        },
      },
    },
    orderBy: [{ levelNumber: "asc" }, { id: "asc" }],
    select: { id: true, levelNumber: true, description: true },
  });
}

export async function getLearnerRenewalSubscription(
  role: LearnerSubscriptionRole,
  subscriptionId: string,
) {
  const user = await requireRole(role);
  return prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId: user.id,
      product: requiredProduct(role),
    },
    select: {
      id: true,
      lastPlanCode: true,
      currentPeriodEnd: true,
      level: {
        select: {
          id: true,
          levelNumber: true,
          description: true,
          isActive: true,
          requiresSubscription: true,
        },
      },
    },
  });
}

export const learnerSubscriptionRoles = [Role.STUDENT, Role.TEACHER] as const;

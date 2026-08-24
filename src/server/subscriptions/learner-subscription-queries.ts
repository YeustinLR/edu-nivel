import "server-only";

import { cache } from "react";

import {
  PaymentStatus,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import {
  evaluatePremiumAccess,
  getRequiredSubscriptionProduct,
} from "@/modules/subscriptions/domain/premium-access";
import type {
  LearnerPendingPaymentItem,
  LearnerPaymentHistoryItem,
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

export const LEARNER_PAYMENT_HISTORY_PAGE_SIZE = 10;

export function normalizeLearnerPaymentHistoryPage(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

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
  if (subscription.status === SubscriptionStatus.REFUNDED) return "REFUNDED";
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
    paymentPage = 1,
  ): Promise<LearnerSubscriptionOverview> => {
    const user = await requireRole(role);
    const product = requiredProduct(role);
    const now = new Date();
    const safePaymentPage = Math.max(1, Math.trunc(paymentPage));
    const [
      subscriptions,
      pendingPayments,
      paymentHistoryCount,
      availableLevelCount,
    ] =
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
              select: {
                id: true,
                planCode: true,
                expectedAmountMinor: true,
                receivedAmountMinor: true,
                currency: true,
                method: true,
                confirmedAt: true,
              },
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
            levelId: true,
            planCode: true,
            status: true,
            expectedAmountMinor: true,
            currency: true,
            createdAt: true,
            level: { select: { levelNumber: true } },
          },
        }),
        prisma.payment.count({ where: { userId: user.id, product } }),
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
    const totalPages = Math.max(
      1,
      Math.ceil(paymentHistoryCount / LEARNER_PAYMENT_HISTORY_PAGE_SIZE),
    );
    const effectivePaymentPage = Math.min(safePaymentPage, totalPages);
    const paymentHistory = await prisma.payment.findMany({
      where: { userId: user.id, product },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (effectivePaymentPage - 1) * LEARNER_PAYMENT_HISTORY_PAGE_SIZE,
      take: LEARNER_PAYMENT_HISTORY_PAGE_SIZE,
      select: {
        id: true,
        planCode: true,
        status: true,
        expectedAmountMinor: true,
        receivedAmountMinor: true,
        currency: true,
        method: true,
        createdAt: true,
        confirmedAt: true,
        level: { select: { levelNumber: true } },
      },
    });

    const pendingItems: LearnerPendingPaymentItem[] = pendingPayments.map(
      (payment) => ({
        id: payment.id,
        levelId: payment.levelId,
        levelNumber: payment.level.levelNumber,
        planCode: payment.planCode,
        status: payment.status as LearnerPendingPaymentItem["status"],
        expectedAmountMinor: payment.expectedAmountMinor,
        currency: payment.currency,
        createdAt: payment.createdAt.toISOString(),
        href: `/dashboard/subscription/payments/${encodeURIComponent(payment.id)}`,
      }),
    );
    const pendingByLevelId = new Map(
      pendingItems.map((payment) => [payment.levelId, payment]),
    );

    const items: LearnerSubscriptionItem[] = subscriptions.map(
      (subscription) => {
        const hasConfirmedPayment = subscription.payments.length > 0;
        const latestPayment = subscription.payments[0] ?? null;
        const status = effectiveStatus(
          subscription,
          product,
          hasConfirmedPayment,
          subscription.level.isActive,
          now,
        );
        const canStudy =
          subscription.level.isActive &&
          evaluatePremiumAccess({
            role: user.role,
            emailVerified: user.emailVerified,
            subscription: {
              product: subscription.product,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              hasConfirmedPayment,
            },
            now,
          }).allowed;
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
          canStudy,
          canRenew:
            subscription.level.isActive &&
            subscription.level.requiresSubscription &&
            subscription.product === product,
          latestPayment: latestPayment
            ? {
                planCode: latestPayment.planCode,
                expectedAmountMinor: latestPayment.expectedAmountMinor,
                receivedAmountMinor: latestPayment.receivedAmountMinor,
                currency: latestPayment.currency,
                method: latestPayment.method,
                confirmedAt: latestPayment.confirmedAt?.toISOString() ?? null,
              }
            : null,
          openPayment: pendingByLevelId.get(subscription.levelId) ?? null,
        };
      },
    );

    const historyItems: LearnerPaymentHistoryItem[] = paymentHistory.map(
      (payment) => ({
        id: payment.id,
        levelNumber: payment.level.levelNumber,
        planCode: payment.planCode,
        status: payment.status,
        expectedAmountMinor: payment.expectedAmountMinor,
        receivedAmountMinor: payment.receivedAmountMinor,
        currency: payment.currency,
        method: payment.method,
        createdAt: payment.createdAt.toISOString(),
        confirmedAt: payment.confirmedAt?.toISOString() ?? null,
        href: `/dashboard/subscription/payments/${encodeURIComponent(payment.id)}`,
      }),
    );
    return {
      subscriptions: items,
      pendingPayments: pendingItems,
      availableLevelCount,
      activeCount: items.filter((item) => item.effectiveStatus === "ACTIVE")
        .length,
      paymentHistory: {
        items: historyItems,
        page: effectivePaymentPage,
        pageSize: LEARNER_PAYMENT_HISTORY_PAGE_SIZE,
        totalItems: paymentHistoryCount,
        totalPages,
      },
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

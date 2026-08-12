import "server-only";

import {
  type PaymentStatus,
  type PlanCode,
  Role,
  type SubscriptionProduct,
  type SubscriptionStatus,
} from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export type AdminUserSubscriptionSummary = {
  id: string;
  product: SubscriptionProduct;
  status: SubscriptionStatus;
  levelNumber: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
};

export type AdminUserPaymentSummary = {
  id: string;
  planCode: PlanCode;
  status: PaymentStatus;
  expectedAmountMinor: number;
  levelNumber: number;
  createdAt: Date;
};

export type AdminUserSessionSummary = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  suspensionExpiresAt: Date | null;
  adminCreatedAt: Date | null;
  passwordChangeRequired: boolean;
  setupPending: boolean;
  canManageSuspension: boolean;
  canDelete: boolean;
  selectedLevel: {
    levelNumber: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  counts: {
    modules: number;
    resources: number;
    subscriptions: number;
    payments: number;
    sessions: number;
  };
  recentSessions: AdminUserSessionSummary[];
  subscriptions: AdminUserSubscriptionSummary[];
  recentPayments: AdminUserPaymentSummary[];
};

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const actor = await requireRole(Role.ADMIN);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      suspendedAt: true,
      suspensionReason: true,
      suspensionExpiresAt: true,
      adminCreatedAt: true,
      passwordChangeRequired: true,
      ageVerifiedAt: true,
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      selectedLevel: {
        select: {
          levelNumber: true,
        },
      },
      _count: {
        select: {
          createdModules: true,
          createdResources: true,
          subscriptions: true,
          payments: true,
          sessions: true,
        },
      },
      sessions: {
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 5,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
        },
      },
      subscriptions: {
        orderBy: [{ currentPeriodEnd: "desc" }, { id: "asc" }],
        select: {
          id: true,
          product: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          level: { select: { levelNumber: true } },
        },
      },
      payments: {
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 5,
        select: {
          id: true,
          planCode: true,
          status: true,
          expectedAmountMinor: true,
          createdAt: true,
          level: { select: { levelNumber: true } },
        },
      },
    },
  });

  if (!user || user.deletedAt) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
    suspendedAt: user.suspendedAt,
    suspensionReason: user.suspensionReason,
    suspensionExpiresAt: user.suspensionExpiresAt,
    adminCreatedAt: user.adminCreatedAt,
    passwordChangeRequired: user.passwordChangeRequired,
    setupPending: Boolean(
      user.adminCreatedAt &&
        (user.passwordChangeRequired ||
          !user.ageVerifiedAt ||
          !user.termsAcceptedAt ||
          !user.privacyAcceptedAt),
    ),
    canManageSuspension: actor.id !== user.id,
    canDelete: actor.id !== user.id,
    selectedLevel: user.selectedLevel,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    counts: {
      modules: user._count.createdModules,
      resources: user._count.createdResources,
      subscriptions: user._count.subscriptions,
      payments: user._count.payments,
      sessions: user._count.sessions,
    },
    recentSessions: user.sessions,
    subscriptions: user.subscriptions.map((subscription) => ({
      id: subscription.id,
      product: subscription.product,
      status: subscription.status,
      levelNumber: subscription.level.levelNumber,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })),
    recentPayments: user.payments.map((payment) => ({
      id: payment.id,
      planCode: payment.planCode,
      status: payment.status,
      expectedAmountMinor: payment.expectedAmountMinor,
      levelNumber: payment.level.levelNumber,
      createdAt: payment.createdAt,
    })),
  };
}

import {
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
  type ResourceType,
} from "@/generated/prisma/enums";
import { evaluatePremiumAccess } from "@/modules/subscriptions/domain/premium-access";
import type {
  EducationStage,
  StudentExploreAccess,
} from "@/modules/content/types/student-explore";

export const educationStages = ["primary", "secondary"] as const;

export function isEducationStage(value: unknown): value is EducationStage {
  return educationStages.some((stage) => stage === value);
}

export function educationStageForLevel(levelNumber: number): EducationStage {
  return levelNumber <= 6 ? "primary" : "secondary";
}

export function summarizeResourceTypes(types: ResourceType[]) {
  const frequency = new Map<ResourceType, number>();
  for (const type of types) {
    frequency.set(type, (frequency.get(type) ?? 0) + 1);
  }

  const ordered = [...frequency.entries()]
    .sort(([leftType, leftCount], [rightType, rightCount]) =>
      rightCount - leftCount || leftType.localeCompare(rightType),
    )
    .map(([type]) => type);

  return {
    resourceTypes: ordered.slice(0, 3),
    additionalResourceTypeCount: Math.max(0, ordered.length - 3),
  };
}

type ExploreSubscriptionSnapshot = {
  id: string;
  product: SubscriptionProduct;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  hasConfirmedPayment: boolean;
};

export function getStudentExploreAccess({
  requiresSubscription,
  emailVerified,
  subscription,
  pendingPaymentId,
  now,
}: {
  requiresSubscription: boolean;
  emailVerified: boolean;
  subscription: ExploreSubscriptionSnapshot | null;
  pendingPaymentId: string | null;
  now?: Date;
}): StudentExploreAccess {
  if (!requiresSubscription) {
    return {
      status: "INCLUDED",
      currentPeriodEnd: null,
      subscriptionId: null,
      pendingPaymentId: null,
    };
  }

  if (subscription) {
    const decision = evaluatePremiumAccess({
      role: Role.STUDENT,
      emailVerified,
      subscription,
      now,
    });
    if (decision.allowed) {
      return {
        status:
          subscription.status === SubscriptionStatus.CANCELED
            ? "CANCELED_ACTIVE"
            : "ACTIVE",
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        subscriptionId: subscription.id,
        pendingPaymentId: null,
      };
    }

    if (pendingPaymentId) {
      return {
        status: "PENDING",
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        subscriptionId: subscription.id,
        pendingPaymentId,
      };
    }

    const expired =
      subscription.status === SubscriptionStatus.EXPIRED ||
      subscription.currentPeriodEnd <= (now ?? new Date());
    return {
      status: expired ? "EXPIRED" : "LOCKED",
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      subscriptionId: subscription.id,
      pendingPaymentId: null,
    };
  }

  return {
    status: pendingPaymentId ? "PENDING" : "LOCKED",
    currentPeriodEnd: null,
    subscriptionId: null,
    pendingPaymentId,
  };
}

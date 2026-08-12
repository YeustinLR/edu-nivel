import type {
  PlanCode,
  Role,
  SubscriptionStatus,
} from "@/generated/prisma/enums";

export type LearnerSubscriptionRole = typeof Role.STUDENT | typeof Role.TEACHER;

export type LearnerSubscriptionEffectiveStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELED"
  | "INACTIVE";

export type LearnerSubscriptionItem = {
  id: string;
  level: {
    id: string;
    levelNumber: number;
    description: string | null;
    isActive: boolean;
    requiresSubscription: boolean;
  };
  persistedStatus: SubscriptionStatus;
  effectiveStatus: LearnerSubscriptionEffectiveStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastPlanCode: PlanCode | null;
  hasConfirmedPayment: boolean;
  isSelectedLevel: boolean;
  canStudy: boolean;
  canRenew: boolean;
};

export type LearnerPendingPaymentItem = {
  id: string;
  levelNumber: number;
  planCode: PlanCode;
  status: "INITIALIZING" | "PROCESSING" | "REQUIRES_REVIEW";
  expectedAmountMinor: number;
  currency: string;
  createdAt: string;
  href: string;
};

export type LearnerSubscriptionOverview = {
  subscriptions: LearnerSubscriptionItem[];
  pendingPayments: LearnerPendingPaymentItem[];
  availableLevelCount: number;
  activeCount: number;
};

export type LearnerSubscriptionCheckoutLevel = {
  id: string;
  levelNumber: number;
  description: string | null;
};

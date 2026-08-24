import type {
  PaymentMethod,
  PaymentStatus,
  PlanCode,
  Role,
  SubscriptionStatus,
} from "@/generated/prisma/enums";

export type LearnerSubscriptionRole = typeof Role.STUDENT | typeof Role.TEACHER;

export type LearnerSubscriptionEffectiveStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELED"
  | "REFUNDED"
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
  latestPayment: LearnerSubscriptionPaymentSummary | null;
  openPayment: LearnerPendingPaymentItem | null;
};

export type LearnerSubscriptionPaymentSummary = {
  planCode: PlanCode;
  expectedAmountMinor: number;
  receivedAmountMinor: number | null;
  currency: string;
  method: PaymentMethod;
  confirmedAt: string | null;
};

export type LearnerPendingPaymentItem = {
  id: string;
  levelId: string;
  levelNumber: number;
  planCode: PlanCode;
  status: "INITIALIZING" | "PROCESSING" | "REQUIRES_REVIEW";
  expectedAmountMinor: number;
  currency: string;
  createdAt: string;
  href: string;
};

export type LearnerPaymentHistoryItem = {
  id: string;
  levelNumber: number;
  planCode: PlanCode;
  status: PaymentStatus;
  expectedAmountMinor: number;
  receivedAmountMinor: number | null;
  currency: string;
  method: PaymentMethod;
  createdAt: string;
  confirmedAt: string | null;
  href: string;
};

export type LearnerPaymentHistory = {
  items: LearnerPaymentHistoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type LearnerSubscriptionOverview = {
  subscriptions: LearnerSubscriptionItem[];
  pendingPayments: LearnerPendingPaymentItem[];
  availableLevelCount: number;
  activeCount: number;
  paymentHistory: LearnerPaymentHistory;
};

export type LearnerSubscriptionCheckoutLevel = {
  id: string;
  levelNumber: number;
  description: string | null;
};

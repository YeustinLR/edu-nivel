import "server-only";

import {
  PaymentStatus,
  PlanCode,
  Prisma,
  PrismaClient,
  ProviderMode,
  Role,
} from "@/generated/prisma/client";
import { env } from "@/config/env";
import {
  costaRicaMonthKey,
  getAdminPaymentHistoryStart,
  getAdminPaymentReportingPeriods,
  paymentMetricPercentage,
  startOfCostaRicaMonth,
} from "@/modules/payments/domain/admin-payment-reporting";
import { providerModeForEnvironment } from "@/modules/payments/domain/provider-mode";
import {
  adminPaymentStatusValues,
  type ParsedAdminPaymentsSearchParams,
} from "@/modules/payments/schemas/admin-payments.schema";
import { SUBSCRIPTION_PLAN_CODES } from "@/modules/subscriptions/config/plan-catalog";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export type AdminPaymentItem = {
  id: string;
  status: PaymentStatus;
  expectedAmountMinor: number;
  receivedAmountMinor: number | null;
  currency: string;
  planCode: PlanCode;
  internalReference: string;
  providerStatus: string | null;
  providerPaymentIntentId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  appliedAt: Date | null;
  user: { name: string; email: string };
  level: { levelNumber: number };
};

export type AdminPaymentMetric = {
  current: number;
  previous: number;
  percentage: number | null;
};

export type AdminPaymentsSummary = {
  generatedAt: Date;
  paymentMode: ProviderMode;
  metrics: {
    collectedAmountMinor: AdminPaymentMetric;
    confirmedPayments: AdminPaymentMetric;
    requiringReview: number;
    failedOrCanceled: number;
  };
  monthlyTrend: Array<{
    monthKey: string;
    start: Date;
    amountMinor: number;
    paymentCount: number;
    current: boolean;
  }>;
  planBreakdown: Array<{
    planCode: PlanCode;
    amountMinor: number;
    paymentCount: number;
  }>;
  history: {
    items: AdminPaymentItem[];
    totalItems: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
};

export function adminPaymentsProviderMode(
  onvoEnvironment: "test" | "live" | undefined,
) {
  return providerModeForEnvironment(onvoEnvironment);
}

function metric(current: number, previous: number): AdminPaymentMetric {
  return {
    current,
    previous,
    percentage: paymentMetricPercentage(current, previous),
  };
}

function isWithin(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

function historyWhere(
  filters: ParsedAdminPaymentsSearchParams,
  paymentMode: ProviderMode,
  now: Date,
): Prisma.PaymentWhereInput {
  const historyStart = getAdminPaymentHistoryStart(filters.period, now);
  const query = filters.query;

  return {
    providerMode: paymentMode,
    status: filters.status
      ? filters.status
      : { in: [...adminPaymentStatusValues] },
    planCode: filters.plan,
    createdAt: historyStart ? { gte: historyStart, lt: now } : { lt: now },
    ...(query
      ? {
          OR: [
            { id: { contains: query, mode: "insensitive" } },
            { internalReference: { contains: query, mode: "insensitive" } },
            {
              providerPaymentIntentId: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              user: {
                is: {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function getAdminPaymentsSummary(
  filters: ParsedAdminPaymentsSearchParams,
  now = new Date(),
  client: PrismaClient = prisma,
): Promise<AdminPaymentsSummary> {
  await requireRole(Role.ADMIN);
  const paymentMode = adminPaymentsProviderMode(env.ONVO_ENV);
  const periods = getAdminPaymentReportingPeriods(now);
  const where = historyWhere(filters, paymentMode, now);

  const [successfulPayments, requiringReview, failedOrCanceled, totalItems, payments] =
    await Promise.all([
      client.payment.findMany({
        where: {
          providerMode: paymentMode,
          status: PaymentStatus.SUCCEEDED,
          appliedAt: { gte: periods.trend.start, lt: periods.trend.end },
        },
        select: {
          appliedAt: true,
          expectedAmountMinor: true,
          receivedAmountMinor: true,
          planCode: true,
        },
      }),
      client.payment.count({
        where: {
          providerMode: paymentMode,
          status: PaymentStatus.REQUIRES_REVIEW,
        },
      }),
      client.payment.count({
        where: {
          providerMode: paymentMode,
          status: { in: [PaymentStatus.FAILED, PaymentStatus.CANCELED] },
          createdAt: {
            gte: periods.currentMonth.start,
            lt: periods.currentMonth.end,
          },
        },
      }),
      client.payment.count({ where }),
      client.payment.findMany({
        where,
        select: {
          id: true,
          status: true,
          expectedAmountMinor: true,
          receivedAmountMinor: true,
          currency: true,
          planCode: true,
          internalReference: true,
          providerStatus: true,
          providerPaymentIntentId: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          appliedAt: true,
          levelNumberSnapshot: true,
          user: { select: { name: true, email: true } },
          level: { select: { levelNumber: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
    ]);

  const amountOf = (payment: (typeof successfulPayments)[number]) =>
    payment.receivedAmountMinor ?? payment.expectedAmountMinor;
  const currentPayments = successfulPayments.filter(
    (payment) =>
      payment.appliedAt &&
      isWithin(
        payment.appliedAt,
        periods.currentMonth.start,
        periods.currentMonth.end,
      ),
  );
  const previousPayments = successfulPayments.filter(
    (payment) =>
      payment.appliedAt &&
      isWithin(
        payment.appliedAt,
        periods.previousComparableMonth.start,
        periods.previousComparableMonth.end,
      ),
  );
  const sumAmounts = (rows: typeof successfulPayments) =>
    rows.reduce((sum, payment) => sum + amountOf(payment), 0);
  const currentMonthKey = costaRicaMonthKey(now);
  const rowFor = (monthKey: string, planCode?: string) =>
    successfulPayments.filter(
      (payment) =>
        payment.appliedAt &&
        costaRicaMonthKey(payment.appliedAt) === monthKey &&
        (planCode === undefined || payment.planCode === planCode),
    );
  const summarize = (rows: typeof successfulPayments) => ({
    amountMinor: sumAmounts(rows),
    paymentCount: rows.length,
  });

  return {
    generatedAt: now,
    paymentMode,
    metrics: {
      collectedAmountMinor: metric(
        sumAmounts(currentPayments),
        sumAmounts(previousPayments),
      ),
      confirmedPayments: metric(currentPayments.length, previousPayments.length),
      requiringReview,
      failedOrCanceled,
    },
    monthlyTrend: Array.from({ length: 6 }, (_, index) => {
      const start = startOfCostaRicaMonth(now, index - 5);
      const monthKey = costaRicaMonthKey(start);
      return {
        monthKey,
        start,
        ...summarize(rowFor(monthKey)),
        current: monthKey === currentMonthKey,
      };
    }),
    planBreakdown: SUBSCRIPTION_PLAN_CODES.map((planCode) => ({
      planCode,
      ...summarize(rowFor(currentMonthKey, planCode)),
    })),
    history: {
      items: payments.map(({ levelNumberSnapshot, ...payment }) => ({
        ...payment,
        level: {
          levelNumber:
            payment.level?.levelNumber ?? levelNumberSnapshot ?? 0,
        },
      })),
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
      page: filters.page,
      pageSize: filters.pageSize,
    },
  };
}

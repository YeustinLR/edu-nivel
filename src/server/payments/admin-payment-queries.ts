import "server-only";

import {
  PaymentStatus,
  ProviderMode,
  Role,
} from "@/generated/prisma/client";
import { env } from "@/config/env";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

const ADMIN_PAYMENT_STATUSES = [
  PaymentStatus.SUCCEEDED,
  PaymentStatus.REQUIRES_REVIEW,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELED,
] as const;

export type AdminPaymentItem = {
  id: string;
  status: PaymentStatus;
  expectedAmountMinor: number;
  receivedAmountMinor: number | null;
  currency: string;
  planCode: string;
  providerStatus: string | null;
  providerPaymentIntentId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  appliedAt: Date | null;
  user: { name: string; email: string };
  level: { levelNumber: number };
};

export type AdminPaymentsSummary = {
  generatedAt: Date;
  paymentMode: ProviderMode;
  payments: AdminPaymentItem[];
  counts: {
    confirmed: number;
    requiringReview: number;
    failedOrCanceled: number;
  };
};

export function adminPaymentsProviderMode(
  onvoEnvironment: "test" | "live" | undefined,
) {
  return onvoEnvironment === "live" ? ProviderMode.LIVE : ProviderMode.TEST;
}

export async function getAdminPaymentsSummary(
  now = new Date(),
): Promise<AdminPaymentsSummary> {
  await requireRole(Role.ADMIN);
  const paymentMode = adminPaymentsProviderMode(env.ONVO_ENV);

  const [payments, countsByStatus] = await Promise.all([
    prisma.payment.findMany({
      where: {
        providerMode: paymentMode,
        status: { in: [...ADMIN_PAYMENT_STATUSES] },
      },
      select: {
        id: true,
        status: true,
        expectedAmountMinor: true,
        receivedAmountMinor: true,
        currency: true,
        planCode: true,
        providerStatus: true,
        providerPaymentIntentId: true,
        errorCode: true,
        errorMessage: true,
        createdAt: true,
        appliedAt: true,
        user: { select: { name: true, email: true } },
        level: { select: { levelNumber: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: {
        providerMode: paymentMode,
        status: { in: [...ADMIN_PAYMENT_STATUSES] },
      },
      _count: { _all: true },
    }),
  ]);

  const count = (status: PaymentStatus) =>
    countsByStatus.find((row) => row.status === status)?._count._all ?? 0;

  return {
    generatedAt: now,
    paymentMode,
    payments,
    counts: {
      confirmed: count(PaymentStatus.SUCCEEDED),
      requiringReview: count(PaymentStatus.REQUIRES_REVIEW),
      failedOrCanceled:
        count(PaymentStatus.FAILED) + count(PaymentStatus.CANCELED),
    },
  };
}

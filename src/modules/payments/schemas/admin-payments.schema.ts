import { z } from "zod";

import { PaymentStatus, PlanCode } from "@/generated/prisma/client";

export const ADMIN_PAYMENT_HISTORY_PAGE_SIZE = 20;
export const adminPaymentStatusValues = [
  PaymentStatus.INITIALIZING,
  PaymentStatus.PROCESSING,
  PaymentStatus.SUCCEEDED,
  PaymentStatus.REQUIRES_REVIEW,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELED,
] as const;
export const adminPaymentPeriodValues = ["30d", "90d", "12m", "all"] as const;

export type AdminPaymentPeriod = (typeof adminPaymentPeriodValues)[number];

export type AdminPaymentsSearchParams = {
  q?: string | string[];
  status?: string | string[];
  plan?: string | string[];
  period?: string | string[];
  page?: string | string[];
};

const singleString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const pageParameter = z
  .preprocess(
    (value) => {
      const singleValue = singleString(value);
      return singleValue ? Number(singleValue) : 1;
    },
    z.number().int().min(1).max(100_000),
  )
  .catch(1);

const schema = z.object({
  q: z
    .preprocess(singleString, z.string().trim().max(100).optional())
    .catch(undefined),
  status: z
    .preprocess(singleString, z.enum(adminPaymentStatusValues).optional())
    .catch(undefined),
  plan: z
    .preprocess(singleString, z.nativeEnum(PlanCode).optional())
    .catch(undefined),
  period: z
    .preprocess(singleString, z.enum(adminPaymentPeriodValues).optional())
    .catch(undefined),
  page: pageParameter,
});

export type ParsedAdminPaymentsSearchParams = {
  query: string;
  status?: (typeof adminPaymentStatusValues)[number];
  plan?: PlanCode;
  period: AdminPaymentPeriod;
  page: number;
  pageSize: number;
};

export function parseAdminPaymentsSearchParams(
  searchParams: AdminPaymentsSearchParams,
): ParsedAdminPaymentsSearchParams {
  const parsed = schema.parse(searchParams);
  return {
    query: parsed.q ?? "",
    status: parsed.status,
    plan: parsed.plan,
    period: parsed.period ?? "90d",
    page: parsed.page,
    pageSize: ADMIN_PAYMENT_HISTORY_PAGE_SIZE,
  };
}

export function buildAdminPaymentsHref(
  filters: ParsedAdminPaymentsSearchParams,
  page = filters.page,
) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.status) params.set("status", filters.status);
  if (filters.plan) params.set("plan", filters.plan);
  if (filters.period !== "90d") params.set("period", filters.period);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/dashboard/admin/payments${query ? `?${query}` : ""}`;
}

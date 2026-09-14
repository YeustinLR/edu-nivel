import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({ env: { ONVO_ENV: "live" } }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    payment: { count: mocks.count, findMany: mocks.findMany },
  },
}));

import { PaymentStatus, PlanCode, ProviderMode, Role } from "@/generated/prisma/client";
import { getAdminPaymentsSummary } from "@/server/payments/admin-payment-queries";

const filters = {
  query: "ana",
  status: PaymentStatus.SUCCEEDED,
  plan: PlanCode.STUDENT_MONTHLY,
  period: "30d" as const,
  page: 2,
  pageSize: 20,
};

describe("admin payment queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin" });
    mocks.findMany
      .mockResolvedValueOnce([
        {
          appliedAt: new Date("2026-09-05T12:00:00.000Z"),
          expectedAmountMinor: 250_000,
          receivedAmountMinor: null,
          planCode: PlanCode.STUDENT_MONTHLY,
        },
        {
          appliedAt: new Date("2026-09-10T12:00:00.000Z"),
          expectedAmountMinor: 250_000,
          receivedAmountMinor: null,
          planCode: PlanCode.STUDENT_MONTHLY,
        },
        {
          appliedAt: new Date("2026-08-10T12:00:00.000Z"),
          expectedAmountMinor: 400_000,
          receivedAmountMinor: null,
          planCode: PlanCode.STUDENT_MONTHLY,
        },
      ])
      .mockResolvedValueOnce([]);
    mocks.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(21);
  });

  it("builds mode-scoped metrics and a filtered paginated history", async () => {
    const now = new Date("2026-09-13T18:00:00.000Z");
    const summary = await getAdminPaymentsSummary(filters, now);

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.ADMIN);
    expect(mocks.count).toHaveBeenNthCalledWith(1, {
      where: {
        providerMode: ProviderMode.LIVE,
        status: PaymentStatus.REQUIRES_REVIEW,
      },
    });
    expect(mocks.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          providerMode: ProviderMode.LIVE,
          status: PaymentStatus.SUCCEEDED,
          planCode: PlanCode.STUDENT_MONTHLY,
          OR: expect.any(Array),
        }),
        skip: 20,
        take: 20,
      }),
    );
    expect(summary.metrics).toEqual({
      collectedAmountMinor: { current: 500_000, previous: 400_000, percentage: 25 },
      confirmedPayments: { current: 2, previous: 1, percentage: 100 },
      requiringReview: 4,
      failedOrCanceled: 3,
    });
    expect(summary.monthlyTrend).toHaveLength(6);
    expect(summary.monthlyTrend.at(-1)).toMatchObject({
      monthKey: "2026-09",
      amountMinor: 500_000,
      paymentCount: 2,
      current: true,
    });
    expect(summary.planBreakdown).toEqual(
      expect.arrayContaining([
        {
          planCode: PlanCode.STUDENT_MONTHLY,
          amountMinor: 500_000,
          paymentCount: 2,
        },
      ]),
    );
    expect(summary.history).toMatchObject({
      totalItems: 21,
      totalPages: 2,
      page: 2,
      pageSize: 20,
    });
  });
});

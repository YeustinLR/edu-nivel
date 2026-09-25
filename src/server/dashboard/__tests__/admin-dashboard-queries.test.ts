import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  moduleAggregate: vi.fn(),
  moduleCount: vi.fn(),
  resourceAggregate: vi.fn(),
  resourceCount: vi.fn(),
  revisionAggregate: vi.fn(),
  revisionCount: vi.fn(),
  paymentCount: vi.fn(),
  paymentFindMany: vi.fn(),
  invitationCount: vi.fn(),
  subscriptionCount: vi.fn(),
  subscriptionFindMany: vi.fn(),
  notificationRecipientCount: vi.fn(),
  userCount: vi.fn(),
  progressGroupBy: vi.fn(),
  subjectCount: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({ env: { ONVO_ENV: "test" } }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: { aggregate: mocks.moduleAggregate, count: mocks.moduleCount },
    resource: { aggregate: mocks.resourceAggregate, count: mocks.resourceCount },
    contentRevision: { aggregate: mocks.revisionAggregate, count: mocks.revisionCount },
    payment: { count: mocks.paymentCount, findMany: mocks.paymentFindMany },
    userInvitation: { count: mocks.invitationCount },
    subscription: { count: mocks.subscriptionCount, findMany: mocks.subscriptionFindMany },
    notificationRecipient: { count: mocks.notificationRecipientCount },
    user: { count: mocks.userCount },
    resourceProgress: { groupBy: mocks.progressGroupBy },
    subject: { count: mocks.subjectCount },
  },
}));

import { ProviderMode } from "@/generated/prisma/client";
import {
  dashboardProviderMode,
  getAdminDashboardSummary,
} from "@/server/dashboard/admin-dashboard-queries";

const now = new Date("2026-09-10T18:00:00.000Z");

describe("admin dashboard queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ name: "Ana Admin" });
    mocks.moduleAggregate.mockResolvedValue({
      _count: { _all: 2 },
      _min: { submittedForReviewAt: new Date("2026-09-05T12:00:00.000Z") },
    });
    mocks.resourceAggregate.mockResolvedValue({
      _count: { _all: 3 },
      _min: { submittedForReviewAt: new Date("2026-09-04T12:00:00.000Z") },
    });
    mocks.revisionAggregate.mockImplementation(({ where }) =>
      Promise.resolve(
        where.kind === "MODULE"
          ? {
              _count: { _all: 1 },
              _min: { submittedAt: new Date("2026-09-03T12:00:00.000Z") },
            }
          : {
              _count: { _all: 2 },
              _min: { submittedAt: new Date("2026-09-02T12:00:00.000Z") },
            },
      ),
    );
    mocks.revisionCount.mockResolvedValue(2);
    mocks.paymentCount.mockResolvedValue(4);
    mocks.invitationCount.mockResolvedValue(1);
    mocks.subscriptionCount.mockResolvedValue(7);
    mocks.subscriptionFindMany.mockResolvedValue([
      { id: "sub-1", currentPeriodEnd: new Date("2026-09-11T18:00:00.000Z") },
      { id: "sub-2", currentPeriodEnd: new Date("2026-09-12T18:00:00.000Z") },
    ]);
    mocks.notificationRecipientCount.mockResolvedValue(1);
    mocks.paymentFindMany.mockImplementation(({ select }) => {
      if (select.userId) return Promise.resolve([]);
      return Promise.resolve([
        {
          appliedAt: new Date("2026-09-01T12:00:00.000Z"),
          receivedAmountMinor: 10_000,
          expectedAmountMinor: 10_000,
        },
        {
          appliedAt: new Date("2026-08-01T12:00:00.000Z"),
          receivedAmountMinor: null,
          expectedAmountMinor: 4_000,
        },
      ]);
    });
    mocks.userCount.mockResolvedValueOnce(8).mockResolvedValueOnce(5);
    mocks.progressGroupBy.mockResolvedValueOnce([
      { userId: "a" },
      { userId: "b" },
      { userId: "c" },
    ]).mockResolvedValueOnce([{ userId: "a" }]);
    mocks.moduleCount.mockImplementation(({ where }) => {
      if (where.resources) return Promise.resolve(2);
      if (where.publicationStatus === "CHANGES_REQUESTED") return Promise.resolve(3);
      return Promise.resolve(10);
    });
    mocks.resourceCount.mockImplementation(({ where }) =>
      Promise.resolve(where.publicationStatus === "CHANGES_REQUESTED" ? 4 : 20),
    );
    mocks.subjectCount.mockResolvedValue(1);
  });

  it("maps ONVO environments without ever mixing modes", () => {
    expect(dashboardProviderMode("test")).toBe(ProviderMode.TEST);
    expect(dashboardProviderMode(undefined)).toBe(ProviderMode.TEST);
    expect(dashboardProviderMode("live")).toBe(ProviderMode.LIVE);
  });

  it("guards the read before starting dashboard queries", async () => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(getAdminDashboardSummary(now)).rejects.toThrow("FORBIDDEN");
    expect(mocks.moduleAggregate).not.toHaveBeenCalled();
    expect(mocks.requireRole).toHaveBeenCalledWith("ADMIN");
  });

  it("combines review kinds, preserves the oldest date and excludes sent renewals", async () => {
    const result = await getAdminDashboardSummary(now);

    expect(result.attention.pendingReviews).toEqual({
      total: 8,
      modules: 3,
      resources: 5,
      oldestSubmittedAt: new Date("2026-09-02T12:00:00.000Z"),
    });
    expect(result.attention.renewalsNeedingReminder).toBe(1);
    expect(result.attention.expiredInvitations).toBe(1);
  });

  it("calculates collection, unique activity and actionable content gaps", async () => {
    const result = await getAdminDashboardSummary(now);

    expect(result.metrics.collected).toEqual({ current: 10_000, previous: 4_000 });
    expect(result.metrics.paidAccesses).toEqual({ current: 7, previous: null });
    expect(result.metrics.emailVerifications).toEqual({ current: 8, previous: 5 });
    expect(mocks.userCount).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              emailVerifiedAt: {
                gte: new Date("2026-08-11T18:00:00.000Z"),
                lt: now,
              },
            }),
          ]),
        }),
      }),
    );
    expect(result.metrics.activeLearners).toEqual({ current: 3, previous: 1 });
    expect(result.contentHealth).toEqual({
      publishedModules: 10,
      publishedResources: 20,
      changesRequested: 9,
      modulesWithoutPublishedResources: 2,
      subjectsWithoutPublishedModules: 1,
    });
  });

  it("filters money and access queries to TEST and uses half-open date ranges", async () => {
    await getAdminDashboardSummary(now);

    const collectionQuery = mocks.paymentFindMany.mock.calls.find(
      ([input]) => input.select.appliedAt,
    )?.[0];
    expect(collectionQuery.where).toMatchObject({
      providerMode: ProviderMode.TEST,
      status: "SUCCEEDED",
      appliedAt: {
        gte: new Date("2026-07-12T18:00:00.000Z"),
        lt: now,
      },
    });
    expect(mocks.subscriptionCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: { in: ["ACTIVE", "CANCELED"] },
        currentPeriodEnd: { gt: now },
        payments: {
          some: expect.objectContaining({
            providerMode: ProviderMode.TEST,
            status: { in: ["SUCCEEDED", "REQUIRES_REVIEW"] },
            appliedAt: { not: null },
          }),
        },
      }),
    });
  });

  it("never queries the legacy payment refund model", async () => {
    await getAdminDashboardSummary(now);

    expect(JSON.stringify(mocks.paymentFindMany.mock.calls)).not.toContain(
      "paymentRefund",
    );
  });
});

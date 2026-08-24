import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PaymentStatus,
  PlanCode,
  Role,
  PaymentMethod,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  subscriptionFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
  paymentCount: vi.fn(),
  levelCount: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: { findMany: mocks.subscriptionFindMany },
    payment: { findMany: mocks.paymentFindMany, count: mocks.paymentCount },
    level: { count: mocks.levelCount },
  },
}));

import {
  getLearnerSubscriptionOverview,
  normalizeLearnerPaymentHistoryPage,
} from "@/server/subscriptions/learner-subscription-queries";

function subscription(input: {
  id: string;
  levelId: string;
  levelNumber: number;
  end: string;
  confirmed?: boolean;
}) {
  return {
    id: input.id,
    userId: "student-1",
    levelId: input.levelId,
    product: SubscriptionProduct.STUDENT_PREMIUM,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date("2020-01-01T00:00:00.000Z"),
    currentPeriodEnd: new Date(input.end),
    lastPlanCode: PlanCode.STUDENT_MONTHLY,
    level: {
      id: input.levelId,
      levelNumber: input.levelNumber,
      description: null,
      isActive: true,
      requiresSubscription: true,
    },
    payments:
      input.confirmed === false
        ? []
        : [
            {
              id: `payment-${input.id}`,
              planCode: PlanCode.STUDENT_MONTHLY,
              expectedAmountMinor: 350_000,
              receivedAmountMinor: 350_000,
              currency: "CRC",
              method: PaymentMethod.SINPE_MOBILE,
              confirmedAt: new Date("2026-08-10T12:00:00.000Z"),
            },
          ],
  };
}

describe("getLearnerSubscriptionOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      emailVerified: true,
      selectedLevelId: "level-7",
    });
    mocks.subscriptionFindMany.mockResolvedValue([
      subscription({ id: "sub-7", levelId: "level-7", levelNumber: 7, end: "2999-01-01T00:00:00.000Z" }),
      subscription({ id: "sub-8", levelId: "level-8", levelNumber: 8, end: "2000-01-01T00:00:00.000Z" }),
    ]);
    mocks.paymentFindMany.mockImplementation(
      (query: { where?: { status?: unknown } }) =>
        query.where?.status
          ? Promise.resolve([
              {
                id: "pending-9",
                levelId: "level-9",
                planCode: PlanCode.STUDENT_YEARLY,
                status: PaymentStatus.PROCESSING,
                expectedAmountMinor: 3_360_000,
                currency: "CRC",
                createdAt: new Date("2026-08-11T12:00:00.000Z"),
                level: { levelNumber: 9 },
              },
            ])
          : Promise.resolve([
              {
                id: "history-7",
                planCode: PlanCode.STUDENT_MONTHLY,
                status: PaymentStatus.SUCCEEDED,
                expectedAmountMinor: 350_000,
                receivedAmountMinor: 350_000,
                currency: "CRC",
                method: PaymentMethod.SINPE_MOBILE,
                createdAt: new Date("2026-08-10T12:00:00.000Z"),
                confirmedAt: new Date("2026-08-10T12:05:00.000Z"),
                level: { levelNumber: 7 },
              },
            ]),
    );
    mocks.paymentCount.mockResolvedValue(1);
    mocks.levelCount.mockResolvedValue(2);
  });

  it("lists every subscription independently and computes effective status", async () => {
    const result = await getLearnerSubscriptionOverview(Role.STUDENT);

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(mocks.levelCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        payments: {
          none: {
            userId: "student-1",
            status: {
              in: [
                PaymentStatus.INITIALIZING,
                PaymentStatus.PROCESSING,
                PaymentStatus.REQUIRES_REVIEW,
              ],
            },
          },
        },
      }),
    });
    expect(result.subscriptions).toEqual([
      expect.objectContaining({ id: "sub-7", effectiveStatus: "ACTIVE", isSelectedLevel: true, canStudy: true }),
      expect.objectContaining({ id: "sub-8", effectiveStatus: "EXPIRED", isSelectedLevel: false, canStudy: false }),
    ]);
    expect(result.activeCount).toBe(1);
    expect(result.availableLevelCount).toBe(2);
    expect(result.subscriptions[0].latestPayment).toMatchObject({
      method: PaymentMethod.SINPE_MOBILE,
      receivedAmountMinor: 350_000,
    });
    expect(result.paymentHistory.items[0]).toMatchObject({
      id: "history-7",
      status: PaymentStatus.SUCCEEDED,
    });
  });

  it("keeps open payments separate from acquired access", async () => {
    const result = await getLearnerSubscriptionOverview(Role.STUDENT);

    expect(result.pendingPayments).toEqual([
      expect.objectContaining({
        id: "pending-9",
        levelNumber: 9,
        status: PaymentStatus.PROCESSING,
      }),
    ]);
    expect(result.subscriptions).toHaveLength(2);
  });

  it("does not treat an unconfirmed subscription as active", async () => {
    mocks.subscriptionFindMany.mockResolvedValue([
      subscription({ id: "sub-7", levelId: "level-7", levelNumber: 7, end: "2999-01-01T00:00:00.000Z", confirmed: false }),
    ]);

    const result = await getLearnerSubscriptionOverview(Role.STUDENT);

    expect(result.subscriptions[0]).toMatchObject({
      effectiveStatus: "INACTIVE",
      hasConfirmedPayment: false,
      canStudy: false,
    });
  });

  it("does not count a disabled level as active access", async () => {
    const disabled = subscription({
      id: "sub-7",
      levelId: "level-7",
      levelNumber: 7,
      end: "2999-01-01T00:00:00.000Z",
    });
    disabled.level.isActive = false;
    mocks.subscriptionFindMany.mockResolvedValue([disabled]);

    const result = await getLearnerSubscriptionOverview(Role.STUDENT);

    expect(result.subscriptions[0]).toMatchObject({
      effectiveStatus: "INACTIVE",
      canStudy: false,
    });
    expect(result.activeCount).toBe(0);
  });

  it("honors an explicitly expired persisted status", async () => {
    const expired = {
      ...subscription({
        id: "sub-7",
        levelId: "level-7",
        levelNumber: 7,
        end: "2999-01-01T00:00:00.000Z",
      }),
      status: SubscriptionStatus.EXPIRED,
    };
    mocks.subscriptionFindMany.mockResolvedValue([expired]);

    const result = await getLearnerSubscriptionOverview(Role.STUDENT);

    expect(result.subscriptions[0]).toMatchObject({
      effectiveStatus: "EXPIRED",
      canStudy: false,
    });
  });

  it("keeps study access for a canceled subscription until its paid period ends", async () => {
    const canceled = {
      ...subscription({
        id: "sub-7",
        levelId: "level-7",
        levelNumber: 7,
        end: "2999-01-01T00:00:00.000Z",
      }),
      status: SubscriptionStatus.CANCELED,
    };
    mocks.subscriptionFindMany.mockResolvedValue([canceled]);

    const result = await getLearnerSubscriptionOverview(Role.STUDENT);

    expect(result.subscriptions[0]).toMatchObject({
      effectiveStatus: "CANCELED",
      canStudy: true,
    });
    expect(result.activeCount).toBe(0);
  });

  it("shows a refunded subscription without study access", async () => {
    const refunded = {
      ...subscription({
        id: "sub-7",
        levelId: "level-7",
        levelNumber: 7,
        end: "2999-01-01T00:00:00.000Z",
      }),
      status: SubscriptionStatus.REFUNDED,
      payments: [],
    };
    mocks.subscriptionFindMany.mockResolvedValue([refunded]);

    const result = await getLearnerSubscriptionOverview(Role.STUDENT);

    expect(result.subscriptions[0]).toMatchObject({
      effectiveStatus: "REFUNDED",
      canStudy: false,
    });
  });

  it("scopes teacher subscriptions and pending payments to the teacher product", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      role: Role.TEACHER,
      emailVerified: true,
      selectedLevelId: "level-9",
    });
    mocks.subscriptionFindMany.mockResolvedValue([
      {
        ...subscription({
          id: "teacher-sub-9",
          levelId: "level-9",
          levelNumber: 9,
          end: "2999-01-01T00:00:00.000Z",
        }),
        userId: "teacher-1",
        product: SubscriptionProduct.TEACHER_PREMIUM,
        lastPlanCode: PlanCode.TEACHER_MONTHLY,
      },
    ]);
    mocks.paymentFindMany.mockResolvedValue([]);
    mocks.paymentCount.mockResolvedValue(0);

    const result = await getLearnerSubscriptionOverview(Role.TEACHER);

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.TEACHER);
    expect(mocks.subscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "teacher-1",
          product: SubscriptionProduct.TEACHER_PREMIUM,
        },
      }),
    );
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "teacher-1",
          product: SubscriptionProduct.TEACHER_PREMIUM,
        }),
      }),
    );
    expect(result.subscriptions[0]).toMatchObject({
      id: "teacher-sub-9",
      effectiveStatus: "ACTIVE",
      canStudy: true,
    });
  });
});

describe("normalizeLearnerPaymentHistoryPage", () => {
  it("accepts positive integers and rejects unsafe values", () => {
    expect(normalizeLearnerPaymentHistoryPage("3")).toBe(3);
    expect(normalizeLearnerPaymentHistoryPage("0")).toBe(1);
    expect(normalizeLearnerPaymentHistoryPage("-2")).toBe(1);
    expect(normalizeLearnerPaymentHistoryPage("1.5")).toBe(1);
    expect(normalizeLearnerPaymentHistoryPage(undefined)).toBe(1);
  });
});

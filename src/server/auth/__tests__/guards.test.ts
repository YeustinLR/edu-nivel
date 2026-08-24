import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PaymentStatus,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/client";

const {
  getSessionMock,
  levelFindUniqueMock,
  subscriptionFindUniqueMock,
  userFindUniqueMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  levelFindUniqueMock: vi.fn(),
  subscriptionFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: <T,>(callback: T) => callback }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/server/auth/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    level: { findUnique: levelFindUniqueMock },
    subscription: { findUnique: subscriptionFindUniqueMock },
    user: { findUnique: userFindUniqueMock },
  },
}));
vi.mock("@/modules/users/domain/user-suspension", () => ({
  isUserCurrentlySuspended: vi.fn().mockReturnValue(false),
}));

import { getPremiumAccessDecision } from "@/server/auth/guards";

describe("getPremiumAccessDecision", () => {
  beforeEach(() => {
    getSessionMock.mockReset().mockResolvedValue({
      user: { id: "student-1" },
      session: { id: "session-1" },
    });
    userFindUniqueMock.mockReset().mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      emailVerified: true,
      selectedLevelId: "level-1",
      subscriptions: [],
      selectedLevel: null,
      deletedAt: null,
      adminCreatedAt: null,
    });
    levelFindUniqueMock.mockReset().mockResolvedValue({
      isActive: true,
      requiresSubscription: true,
    });
    subscriptionFindUniqueMock.mockReset().mockResolvedValue({
      id: "subscription-1",
      userId: "student-1",
      levelId: "level-1",
      product: SubscriptionProduct.STUDENT_PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(Date.now() - 86_400_000),
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      payments: [{ id: "payment-1" }],
    });
  });

  it("loads only a payment identifier to prove a confirmed financial application", async () => {
    const result = await getPremiumAccessDecision("level-1");

    expect(result.decision).toEqual({ allowed: true });
    expect(subscriptionFindUniqueMock).toHaveBeenCalledWith({
      where: {
        userId_levelId: {
          userId: "student-1",
          levelId: "level-1",
        },
      },
      include: {
        payments: {
          where: {
            status: PaymentStatus.SUCCEEDED,
            appliedAt: { not: null },
          },
          select: { id: true },
          orderBy: { appliedAt: "desc" },
          take: 1,
        },
      },
    });
  });

  it("keeps denying premium access when no applied payment exists", async () => {
    subscriptionFindUniqueMock.mockResolvedValue({
      id: "subscription-1",
      userId: "student-1",
      levelId: "level-1",
      product: SubscriptionProduct.STUDENT_PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(Date.now() - 86_400_000),
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      payments: [],
    });

    const result = await getPremiumAccessDecision("level-1");

    expect(result.decision).toEqual({
      allowed: false,
      code: "SUBSCRIPTION_PAYMENT_UNCONFIRMED",
    });
  });
});

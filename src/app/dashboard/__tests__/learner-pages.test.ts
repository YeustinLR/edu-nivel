import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const {
  getStudentContentCanonicalHrefMock,
  getLearnerSubscriptionOverviewMock,
  getStudentContentWorkspaceMock,
  getStudentDashboardDataMock,
  requireRoleMock,
  requireUserMock,
} = vi.hoisted(() => ({
  getStudentContentCanonicalHrefMock: vi.fn(),
  getLearnerSubscriptionOverviewMock: vi.fn(),
  getStudentContentWorkspaceMock: vi.fn(),
  getStudentDashboardDataMock: vi.fn(),
  requireRoleMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  requireRole: requireRoleMock,
  requireUser: requireUserMock,
}));
vi.mock("@/server/content/learner-dashboard-queries", () => ({
  getStudentDashboardData: getStudentDashboardDataMock,
}));
vi.mock("@/server/content/student-content-workspace-queries", () => ({
  getStudentContentCanonicalHref: getStudentContentCanonicalHrefMock,
  getStudentContentWorkspace: getStudentContentWorkspaceMock,
}));
vi.mock("@/server/subscriptions/learner-subscription-queries", () => ({
  getLearnerSubscriptionOverview: getLearnerSubscriptionOverviewMock,
  normalizeLearnerPaymentHistoryPage: () => 1,
}));
vi.mock("@/modules/dashboard/components/student/StudentDashboardHome", () => ({
  StudentDashboardHome: () => null,
}));
vi.mock("@/modules/content/components/student-content/StudentContentWorkspace", () => ({
  StudentContentWorkspace: () => null,
}));
vi.mock("@/modules/subscriptions/components/LearnerSubscriptionManager", () => ({
  LearnerSubscriptionManager: () => null,
}));
vi.mock("@/modules/dashboard/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => null,
}));
vi.mock("@/modules/dashboard/components/learner/LearnerPageHeader", () => ({
  LearnerPageHeader: () => null,
}));

import StudentContentPage from "@/app/dashboard/student/content/page";
import StudentDashboardPage from "@/app/dashboard/student/page";
import StudentSettingsPage from "@/app/dashboard/student/settings/page";
import SubscriptionPage from "@/app/dashboard/subscription/page";

describe("learner pages after shell data separation", () => {
  beforeEach(() => {
    getStudentDashboardDataMock.mockReset().mockResolvedValue({
      user: { name: "Ana" },
      subjects: [],
    });
    getStudentContentWorkspaceMock.mockReset().mockResolvedValue({
      status: "NO_LEVEL",
    });
    getStudentContentCanonicalHrefMock.mockReset().mockResolvedValue(null);
    requireRoleMock.mockReset().mockResolvedValue({
      name: "Ana",
      email: "ana@example.com",
      selectedLevel: { id: "level-7", levelNumber: 7 },
    });
    requireUserMock.mockReset().mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
    });
    getLearnerSubscriptionOverviewMock.mockReset().mockResolvedValue({
      subscriptions: [],
      payments: [],
    });
  });

  it("keeps academic dashboard data on the student home page", async () => {
    const result = await StudentDashboardPage();

    expect(getStudentDashboardDataMock).toHaveBeenCalledOnce();
    expect(isValidElement(result)).toBe(true);
    if (!isValidElement<{ data: { subjects: unknown[] } }>(result)) {
      throw new Error("Expected dashboard content.");
    }
    expect(result.props.data).toMatchObject({ subjects: [] });
  });

  it("keeps Content on its own workspace query", async () => {
    const result = await StudentContentPage({
      searchParams: Promise.resolve({
        subject: "subject-1",
        resource: "resource-1",
      }),
    });

    expect(getStudentContentWorkspaceMock).toHaveBeenCalledWith({
      requestedSubjectId: "subject-1",
      requestedResourceId: "resource-1",
    });
    expect(getStudentContentCanonicalHrefMock).not.toHaveBeenCalled();
    expect(getStudentDashboardDataMock).not.toHaveBeenCalled();
    expect(isValidElement(result)).toBe(true);
  });

  it("renders Settings from the authenticated user without academic queries", async () => {
    const result = await StudentSettingsPage();

    expect(requireRoleMock).toHaveBeenCalledWith(Role.STUDENT);
    expect(getStudentDashboardDataMock).not.toHaveBeenCalled();
    expect(isValidElement(result)).toBe(true);
  });

  it("keeps Subscription on its own query without learner dashboard data", async () => {
    const result = await SubscriptionPage({
      searchParams: Promise.resolve({}),
    });

    expect(requireUserMock).toHaveBeenCalledOnce();
    expect(getLearnerSubscriptionOverviewMock).toHaveBeenCalledWith(
      Role.STUDENT,
      1,
    );
    expect(getStudentDashboardDataMock).not.toHaveBeenCalled();
    expect(isValidElement(result)).toBe(true);
  });
});

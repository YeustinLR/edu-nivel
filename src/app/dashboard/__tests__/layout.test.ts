import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const {
  getLearnerDashboardDataMock,
  getStudentCatalogSearchItemsMock,
  recordLearnerDashboardVisitMock,
  requireExactRoleOrRedirectMock,
  requireUserMock,
} = vi.hoisted(() => ({
  getLearnerDashboardDataMock: vi.fn(),
  getStudentCatalogSearchItemsMock: vi.fn(),
  recordLearnerDashboardVisitMock: vi.fn(),
  requireExactRoleOrRedirectMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  Role: {
    STUDENT: "STUDENT",
    TEACHER: "TEACHER",
    COLLABORATOR: "COLLABORATOR",
    ADMIN: "ADMIN",
  },
  requireExactRoleOrRedirect: requireExactRoleOrRedirectMock,
  requireUser: requireUserMock,
}));
vi.mock("@/server/content/learner-dashboard-queries", () => ({
  getLearnerDashboardData: getLearnerDashboardDataMock,
}));
vi.mock("@/server/content/student-catalog-search-queries", () => ({
  getStudentCatalogSearchItems: getStudentCatalogSearchItemsMock,
}));
vi.mock("@/modules/dashboard/components/layout/DashboardShell", () => ({
  DashboardShell: () => null,
}));
vi.mock("@/server/dashboard/learner-streak", () => ({
  recordLearnerDashboardVisit: recordLearnerDashboardVisitMock,
}));

import DashboardLayout from "@/app/dashboard/layout";
import AdminLayout from "@/app/dashboard/admin/layout";
import CollaboratorLayout from "@/app/dashboard/collaborator/layout";
import StudentLayout from "@/app/dashboard/student/layout";

describe("dashboard layouts", () => {
  beforeEach(() => {
    requireUserMock.mockReset().mockResolvedValue({
      id: "student-1",
      name: "Ana Estudiante",
      email: "ana@example.com",
      image: "https://example.com/avatar.png",
      role: Role.STUDENT,
    });
    requireExactRoleOrRedirectMock.mockReset().mockResolvedValue(undefined);
    getLearnerDashboardDataMock.mockReset();
    getStudentCatalogSearchItemsMock.mockReset();
    recordLearnerDashboardVisitMock.mockReset().mockResolvedValue(2);
  });

  it("authenticates and renders the learner shell with only identity data", async () => {
    const result = await DashboardLayout({ children: "student-page" });

    expect(requireUserMock).toHaveBeenCalledOnce();
    expect(isValidElement(result)).toBe(true);
    if (!isValidElement(result)) throw new Error("Expected a dashboard shell.");
    expect(result.props).toMatchObject({
      learnerStreakDays: 2,
      userName: "Ana Estudiante",
      userEmail: "ana@example.com",
      userRole: Role.STUDENT,
      userImage: "https://example.com/avatar.png",
      children: "student-page",
    });
    expect(recordLearnerDashboardVisitMock).toHaveBeenCalledWith("student-1");
    expect(result.props).not.toHaveProperty("learnerShellData");
    expect(getLearnerDashboardDataMock).not.toHaveBeenCalled();
    expect(getStudentCatalogSearchItemsMock).not.toHaveBeenCalled();
  });

  it("keeps unauthenticated requests protected by the server guard", async () => {
    requireUserMock.mockRejectedValue(new Error("UNAUTHENTICATED"));

    await expect(
      DashboardLayout({ children: "private-page" }),
    ).rejects.toThrow("UNAUTHENTICATED");
    expect(getLearnerDashboardDataMock).not.toHaveBeenCalled();
  });

  it("keeps exact student role authorization in the nested layout", async () => {
    const result = await StudentLayout({ children: "student-page" });

    expect(requireExactRoleOrRedirectMock).toHaveBeenCalledWith(Role.STUDENT);
    expect(result).toBe("student-page");
  });

  it("keeps administrative and collaborator routes separated by exact role", async () => {
    await expect(AdminLayout({ children: "admin-page" })).resolves.toBe(
      "admin-page",
    );
    expect(requireExactRoleOrRedirectMock).toHaveBeenLastCalledWith(Role.ADMIN);

    await expect(
      CollaboratorLayout({ children: "collaborator-page" }),
    ).resolves.toBe("collaborator-page");
    expect(requireExactRoleOrRedirectMock).toHaveBeenLastCalledWith(
      Role.COLLABORATOR,
    );
  });
});

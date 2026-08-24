import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const {
  getPremiumAccessDecisionMock,
  getPublishedTeacherCatalogMock,
  getStudentCatalogSearchItemsMock,
  requireRoleMock,
} = vi.hoisted(() => ({
  getPremiumAccessDecisionMock: vi.fn(),
  getPublishedTeacherCatalogMock: vi.fn(),
  getStudentCatalogSearchItemsMock: vi.fn(),
  requireRoleMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  getPremiumAccessDecision: getPremiumAccessDecisionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/server/content/student-catalog-search-queries", () => ({
  getStudentCatalogSearchItems: getStudentCatalogSearchItemsMock,
}));
vi.mock("@/server/content/published-academic-catalog-queries", () => ({
  getPublishedTeacherCatalog: getPublishedTeacherCatalogMock,
}));

import { getLearnerSearchItems } from "@/server/content/learner-search-queries";

describe("getLearnerSearchItems", () => {
  beforeEach(() => {
    requireRoleMock.mockReset().mockResolvedValue({
      id: "teacher-1",
      selectedLevelId: "level-7",
      selectedLevel: { id: "level-7", levelNumber: 7 },
    });
    getPremiumAccessDecisionMock.mockReset().mockResolvedValue({
      decision: { allowed: true },
    });
    getStudentCatalogSearchItemsMock.mockReset().mockResolvedValue([
      { id: "level-1", kind: "level" },
    ]);
    getPublishedTeacherCatalogMock.mockReset().mockResolvedValue([
      {
        id: "subject-1",
        name: "Ciencias",
        modules: [
          {
            id: "module-1",
            title: "Ecosistemas",
            resources: [{ id: "resource-1", title: "Bosques" }],
          },
        ],
      },
    ]);
  });

  it("delegates the student catalog only when search is requested", async () => {
    const result = await getLearnerSearchItems(Role.STUDENT);

    expect(result).toEqual([{ id: "level-1", kind: "level" }]);
    expect(getStudentCatalogSearchItemsMock).toHaveBeenCalledOnce();
    expect(getPublishedTeacherCatalogMock).not.toHaveBeenCalled();
  });

  it("builds teacher search metadata without loading progress or saved data", async () => {
    const result = await getLearnerSearchItems(Role.TEACHER);

    expect(requireRoleMock).toHaveBeenCalledWith(Role.TEACHER);
    expect(getPremiumAccessDecisionMock).toHaveBeenCalledWith("level-7");
    expect(result).toEqual([
      expect.objectContaining({ id: "subject-subject-1", label: "Ciencias" }),
      expect.objectContaining({ id: "module-module-1", label: "Ecosistemas" }),
      expect.objectContaining({ id: "resource-resource-1", label: "Bosques" }),
    ]);
    expect(getPublishedTeacherCatalogMock).toHaveBeenCalledWith("level-7");
  });

  it("does not expose teacher catalog metadata without access", async () => {
    getPremiumAccessDecisionMock.mockResolvedValue({
      decision: { allowed: false },
    });

    await expect(getLearnerSearchItems(Role.TEACHER)).resolves.toEqual([]);
    expect(getPublishedTeacherCatalogMock).not.toHaveBeenCalled();
  });
});

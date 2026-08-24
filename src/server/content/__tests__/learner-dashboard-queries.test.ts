import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getPremiumAccessDecision: vi.fn(),
  getActiveAcademicLevels: vi.fn(),
  subjectFindMany: vi.fn(),
  progressFindMany: vi.fn(),
  savedFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
  getPremiumAccessDecision: mocks.getPremiumAccessDecision,
}));
vi.mock("@/server/content/published-academic-catalog-queries", () => ({
  getActiveAcademicLevels: mocks.getActiveAcademicLevels,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subject: { findMany: mocks.subjectFindMany },
    resourceProgress: { findMany: mocks.progressFindMany },
    savedResource: { findMany: mocks.savedFindMany },
  },
}));

import {
  getLearnerDashboardData,
  getStudentDashboardData,
} from "@/server/content/learner-dashboard-queries";

describe("learner dashboard queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "student-1",
      name: "Ana Estudiante",
      email: "ana@example.com",
      role: Role.STUDENT,
      selectedLevelId: "level-7",
    });
    mocks.getActiveAcademicLevels.mockResolvedValue([
      { id: "level-7", levelNumber: 7, description: null, requiresSubscription: false },
    ]);
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: true },
      subscription: null,
    });
    mocks.subjectFindMany.mockResolvedValue([
      {
        id: "subject-math",
        name: "Matemáticas",
        description: null,
        modules: [
          {
            id: "module-fractions",
            title: "Fracciones",
            description: null,
            resources: [
              {
                id: "resource-1",
                title: "Fracciones equivalentes",
                type: ResourceType.NOTE,
                estimatedMinutes: 12,
                youtubeVideo: null,
              },
            ],
          },
        ],
      },
    ]);
    mocks.progressFindMany.mockResolvedValue([]);
    mocks.savedFindMany.mockResolvedValue([]);
  });

  it("requires the STUDENT role and preserves the learner audience/publication filters", async () => {
    const result = await getStudentDashboardData();

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(mocks.subjectFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        levelId: "level-7",
        isActive: true,
        modules: { some: expect.objectContaining({
          publicationStatus: PublicationStatus.PUBLISHED,
          audience: { in: [ContentAudience.STUDENT, ContentAudience.BOTH] },
        }) },
      }),
    }));
    expect(result.subjects).toHaveLength(1);
    expect(result.searchItems).toHaveLength(3);
  });

  it("does not fabricate recent activity and derives zero progress from real resources", async () => {
    const result = await getStudentDashboardData();

    expect(result.recentResources).toEqual([]);
    expect(result.continueTarget).toMatchObject({
      id: "resource-1",
      isProgressRecord: false,
      progressPercent: 0,
    });
  });

  it("returns only persisted saved resources in their saved order", async () => {
    mocks.savedFindMany.mockResolvedValue([
      { resourceId: "resource-1", createdAt: new Date("2026-08-22T12:00:00Z") },
    ]);

    const result = await getStudentDashboardData();

    expect(mocks.savedFindMany).toHaveBeenCalledWith({
      where: {
        userId: "student-1",
        resourceId: { in: ["resource-1"] },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: { resourceId: true, createdAt: true },
    });
    expect(result.savedResources).toEqual([
      expect.objectContaining({
        id: "resource-1",
        savedAt: "2026-08-22T12:00:00.000Z",
        href:
          "/dashboard/student/content?subject=subject-math&resource=resource-1",
      }),
    ]);
  });

  it("orders recent activity by lastViewedAt and continues the latest incomplete resource", async () => {
    mocks.subjectFindMany.mockResolvedValue([
      {
        id: "subject-math",
        name: "Matemáticas",
        description: null,
        modules: [
          {
            id: "module-fractions",
            title: "Fracciones",
            description: null,
            resources: [
              {
                id: "resource-1",
                title: "Introducción",
                type: ResourceType.NOTE,
                estimatedMinutes: 5,
                youtubeVideo: null,
              },
              {
                id: "resource-2",
                title: "Práctica",
                type: ResourceType.PDF,
                estimatedMinutes: 10,
                youtubeVideo: null,
              },
            ],
          },
        ],
      },
    ]);
    mocks.progressFindMany.mockResolvedValue([
      {
        resourceId: "resource-2",
        completed: false,
        startedAt: new Date("2026-08-20T10:00:00Z"),
        lastViewedAt: new Date("2026-08-22T14:00:00Z"),
      },
      {
        resourceId: "resource-1",
        completed: true,
        startedAt: new Date("2026-08-19T10:00:00Z"),
        lastViewedAt: new Date("2026-08-21T14:00:00Z"),
      },
    ]);

    const result = await getStudentDashboardData();

    expect(mocks.progressFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ lastViewedAt: "desc" }, { id: "asc" }],
        select: expect.objectContaining({ lastViewedAt: true }),
      }),
    );
    expect(result.recentResources.map((resource) => resource.id)).toEqual([
      "resource-2",
      "resource-1",
    ]);
    expect(result.continueTarget).toMatchObject({
      id: "resource-2",
      completed: false,
      progressPercent: 50,
      isProgressRecord: true,
    });
  });

  it("does not query protected content when subscription access is denied", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: false },
      subscription: null,
    });

    const result = await getStudentDashboardData();

    expect(result.access.status).toBe("LOCKED");
    expect(result.subjects).toEqual([]);
    expect(mocks.subjectFindMany).not.toHaveBeenCalled();
    expect(mocks.progressFindMany).not.toHaveBeenCalled();
    expect(mocks.savedFindMany).not.toHaveBeenCalled();
  });

  it("isolates the teacher audience and generates teacher routes", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      name: "Mario Docente",
      email: "mario@example.com",
      role: Role.TEACHER,
      selectedLevelId: "level-7",
    });

    const result = await getLearnerDashboardData(Role.TEACHER);

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.TEACHER);
    expect(mocks.subjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          modules: {
            some: expect.objectContaining({
              publicationStatus: PublicationStatus.PUBLISHED,
              audience: {
                in: [ContentAudience.TEACHER, ContentAudience.BOTH],
              },
            }),
          },
        }),
        select: expect.objectContaining({
          modules: expect.objectContaining({
            where: expect.objectContaining({
              audience: {
                in: [ContentAudience.TEACHER, ContentAudience.BOTH],
              },
            }),
          }),
        }),
      }),
    );
    expect(result.subjects[0].href).toBe(
      "/dashboard/teacher/content#subject-subject-math",
    );
    expect(result.searchItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "resource-resource-1",
          href: "/dashboard/teacher/content#subject-subject-math",
        }),
      ]),
    );
    expect(result.availableResources).toEqual([
      expect.objectContaining({
        id: "resource-1",
        href: "/dashboard/teacher/content#subject-subject-math",
      }),
    ]);
  });
});

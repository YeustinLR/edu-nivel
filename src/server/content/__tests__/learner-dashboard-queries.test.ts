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
  levelFindMany: vi.fn(),
  subjectFindMany: vi.fn(),
  progressFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
  getPremiumAccessDecision: mocks.getPremiumAccessDecision,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    level: { findMany: mocks.levelFindMany },
    subject: { findMany: mocks.subjectFindMany },
    resourceProgress: { findMany: mocks.progressFindMany },
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
    mocks.levelFindMany.mockResolvedValue([
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
                description: null,
                type: ResourceType.LESSON,
                lesson: { estimatedMinutes: 12 },
                youtubeVideo: null,
              },
            ],
          },
        ],
      },
    ]);
    mocks.progressFindMany.mockResolvedValue([]);
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

  it("does not fabricate recent activity or a progress percentage", async () => {
    const result = await getStudentDashboardData();

    expect(result.recentResources).toEqual([]);
    expect(result.continueTarget).toMatchObject({
      id: "resource-1",
      isProgressRecord: false,
      progressPercent: null,
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

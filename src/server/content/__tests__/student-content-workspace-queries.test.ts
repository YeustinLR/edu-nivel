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
  levelFindFirst: vi.fn(),
  subjectFindMany: vi.fn(),
  resourceFindFirst: vi.fn(),
  isR2UploadEnabled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
  getPremiumAccessDecision: mocks.getPremiumAccessDecision,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    level: { findFirst: mocks.levelFindFirst },
    subject: { findMany: mocks.subjectFindMany },
    resource: { findFirst: mocks.resourceFindFirst },
  },
}));
vi.mock("@/server/storage/r2", () => ({
  isR2UploadEnabled: mocks.isR2UploadEnabled,
}));

import {
  getStudentContentCanonicalHref,
  getStudentContentWorkspace,
} from "@/server/content/student-content-workspace-queries";

const level = {
  id: "level-7",
  levelNumber: 7,
  description: "Séptimo año",
  requiresSubscription: true,
};

type MockResourceSummary = {
  id: string;
  title: string;
  type: ResourceType;
  estimatedMinutes: number | null;
  youtubeVideo: null;
  audioResource: null;
  progress: Array<{ completed: boolean }>;
};

const subjects: Array<{
  id: string;
  name: string;
  description: string | null;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    resources: MockResourceSummary[];
  }>;
}> = [
  {
    id: "subject-math",
    name: "Matemáticas",
    description: "Aprende matemáticas.",
    modules: [
      {
        id: "module-fractions",
        title: "Fracciones",
        description: null,
        resources: [
          {
            id: "resource-note",
            title: "Fracciones equivalentes",
            type: ResourceType.NOTE,
            estimatedMinutes: 12,
            youtubeVideo: null,
            audioResource: null,
            progress: [],
          },
          {
            id: "resource-pdf",
            title: "Práctica de fracciones",
            type: ResourceType.PDF,
            estimatedMinutes: 20,
            youtubeVideo: null,
            audioResource: null,
            progress: [{ completed: true }],
          },
        ],
      },
      {
        id: "module-decimals",
        title: "Decimales",
        description: null,
        resources: [
          {
            id: "resource-link",
            title: "Calculadora interactiva",
            type: ResourceType.LINK,
            estimatedMinutes: null,
            youtubeVideo: null,
            audioResource: null,
            progress: [],
          },
        ],
      },
    ],
  },
];

function resourceDetail(id: string) {
  const summary = subjects[0].modules
    .flatMap((moduleRecord) => moduleRecord.resources)
    .find((resource) => resource.id === id);
  if (!summary) return null;

  return {
    id: summary.id,
    type: summary.type,
    title: summary.title,
    instructions: "Lee con atención.",
    content: summary.type === ResourceType.NOTE ? "<p>Contenido real</p>" : null,
    estimatedMinutes: summary.estimatedMinutes,
    isRequired: true,
    youtubeVideo: null,
    linkResource:
      summary.type === ResourceType.LINK
        ? { url: "https://example.com/calculadora", openInNewTab: true }
        : null,
    pdfResource:
      summary.type === ResourceType.PDF
        ? {
            originalName: "practica.pdf",
            mimeType: "application/pdf",
            sizeBytes: BigInt(2048),
            pageCount: 4,
            storageKey: "private/never-serialize-this",
          }
        : null,
    imageResource: null,
    fileResource: null,
    audioResource: null,
    quiz: null,
    gameResource: null,
    savedBy: [],
  };
}

describe("student content workspace queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      selectedLevelId: level.id,
    });
    mocks.levelFindFirst.mockResolvedValue(level);
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: true },
      subscription: null,
    });
    mocks.subjectFindMany.mockResolvedValue(subjects);
    mocks.resourceFindFirst.mockImplementation(({ where }) =>
      Promise.resolve(resourceDetail(where.id)),
    );
    mocks.isR2UploadEnabled.mockReturnValue(true);
  });

  it("requires STUDENT and applies every visibility boundary to summaries and detail", async () => {
    await getStudentContentWorkspace({});

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(mocks.subjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { levelId: level.id, isActive: true },
        select: expect.objectContaining({
          modules: expect.objectContaining({
            where: {
              isActive: true,
              publicationStatus: PublicationStatus.PUBLISHED,
              audience: {
                in: [ContentAudience.STUDENT, ContentAudience.BOTH],
              },
            },
          }),
        }),
      }),
    );
    expect(mocks.resourceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "resource-note",
          isActive: true,
          publicationStatus: PublicationStatus.PUBLISHED,
          module: expect.objectContaining({
            isActive: true,
            publicationStatus: PublicationStatus.PUBLISHED,
            audience: {
              in: [ContentAudience.STUDENT, ContentAudience.BOTH],
            },
            subject: expect.objectContaining({
              id: "subject-math",
              levelId: level.id,
              isActive: true,
            }),
          }),
        }),
      }),
    );
  });

  it("selects a valid deep link and builds deterministic previous and next navigation", async () => {
    const result = await getStudentContentWorkspace({
      requestedSubjectId: "subject-math",
      requestedResourceId: "resource-pdf",
    });

    expect(result).toMatchObject({
      status: "READY",
      selectedSubjectId: "subject-math",
      selectedModuleId: "module-fractions",
      selectedResourceId: "resource-pdf",
      resourcePosition: 2,
      resourceCount: 3,
      moduleResourcePosition: 2,
      moduleResourceCount: 2,
      selectedResource: { isCompleted: true, isSaved: false },
      previous: { id: "resource-note" },
      next: { id: "resource-link" },
    });
  });

  it("never serializes a storage key in the learner DTO", async () => {
    const result = await getStudentContentWorkspace({
      requestedSubjectId: "subject-math",
      requestedResourceId: "resource-pdf",
    });

    expect(JSON.stringify(result)).not.toContain("storageKey");
    if (result.status !== "READY") throw new Error("Expected READY state");
    expect(result.selectedResource?.pdf).toEqual({
      originalName: "practica.pdf",
      mimeType: "application/pdf",
      sizeBytes: "2048",
      pageCount: 4,
    });
  });

  it("does not query protected catalog data when subscription access is denied", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: false, code: "SUBSCRIPTION_REQUIRED" },
      subscription: null,
    });

    const result = await getStudentContentWorkspace({});

    expect(result).toMatchObject({
      status: "LOCKED",
      denialCode: "SUBSCRIPTION_REQUIRED",
    });
    expect(mocks.subjectFindMany).not.toHaveBeenCalled();
    expect(mocks.resourceFindFirst).not.toHaveBeenCalled();
  });

  it("falls back safely when a deep link points outside the authorized tree", async () => {
    const result = await getStudentContentWorkspace({
      requestedSubjectId: "subject-private",
      requestedResourceId: "resource-private",
    });

    expect(result).toMatchObject({
      status: "READY",
      selectedSubjectId: "subject-math",
      selectedResourceId: "resource-note",
      requestedSubjectUnavailable: true,
      requestedResourceUnavailable: true,
    });
  });

  it("does not combine a subject with a resource from another subject", async () => {
    mocks.subjectFindMany.mockResolvedValue([
      ...subjects,
      {
        id: "subject-science",
        name: "Ciencias",
        description: null,
        modules: [
          {
            id: "module-ecosystems",
            title: "Ecosistemas",
            description: null,
            resources: [
              {
                id: "resource-forest",
                title: "Bosques",
                type: ResourceType.NOTE,
                estimatedMinutes: 10,
                youtubeVideo: null,
                audioResource: null,
                progress: [],
              },
            ],
          },
        ],
      },
    ]);

    const result = await getStudentContentWorkspace({
      requestedSubjectId: "subject-math",
      requestedResourceId: "resource-forest",
    });

    expect(result).toMatchObject({
      status: "READY",
      selectedSubjectId: "subject-math",
      selectedResourceId: "resource-note",
      requestedSubjectUnavailable: false,
      requestedResourceUnavailable: true,
    });
  });

  it.each(["resource-other-level", "resource-unpublished"])(
    "does not expose an unavailable resource ID: %s",
    async (resourceId) => {
      const result = await getStudentContentWorkspace({
        requestedSubjectId: "subject-math",
        requestedResourceId: resourceId,
      });

      expect(result).toMatchObject({
        status: "READY",
        selectedSubjectId: "subject-math",
        selectedResourceId: "resource-note",
        requestedResourceUnavailable: true,
      });
      expect(mocks.resourceFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "resource-note" }),
        }),
      );
    },
  );

  it("resolves the initial canonical URL from ID-only published metadata", async () => {
    const result = await getStudentContentCanonicalHref({});

    expect(result).toBe(
      "/dashboard/student/content?subject=subject-math&resource=resource-note",
    );
    expect(mocks.subjectFindMany).toHaveBeenCalledWith({
      where: { levelId: level.id, isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        modules: {
          where: {
            isActive: true,
            publicationStatus: PublicationStatus.PUBLISHED,
            audience: {
              in: [ContentAudience.STUDENT, ContentAudience.BOTH],
            },
          },
          orderBy: [{ order: "asc" }, { id: "asc" }],
          select: {
            resources: {
              where: {
                isActive: true,
                publicationStatus: PublicationStatus.PUBLISHED,
              },
              orderBy: [{ order: "asc" }, { id: "asc" }],
              select: { id: true },
            },
          },
        },
      },
    });
    expect(mocks.resourceFindFirst).not.toHaveBeenCalled();
  });

  it("canonicalizes a subject-only URL to its first visible resource", async () => {
    await expect(
      getStudentContentCanonicalHref({ requestedSubjectId: "subject-math" }),
    ).resolves.toBe(
      "/dashboard/student/content?subject=subject-math&resource=resource-note",
    );
  });

  it("preserves current resource-only semantics within the default subject", async () => {
    await expect(
      getStudentContentCanonicalHref({
        requestedResourceId: "resource-pdf",
      }),
    ).resolves.toBe(
      "/dashboard/student/content?subject=subject-math&resource=resource-pdf",
    );
  });

  it("falls back when partial parameters reference unavailable content", async () => {
    await expect(
      getStudentContentCanonicalHref({
        requestedSubjectId: "subject-private",
      }),
    ).resolves.toBe(
      "/dashboard/student/content?subject=subject-math&resource=resource-note",
    );
  });

  it("does not resolve catalog IDs without active premium access", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: false, code: "SUBSCRIPTION_REQUIRED" },
      subscription: null,
    });

    await expect(getStudentContentCanonicalHref({})).resolves.toBeNull();
    expect(mocks.subjectFindMany).not.toHaveBeenCalled();
  });
});

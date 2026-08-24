import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentAudience, PublicationStatus } from "@/generated/prisma/enums";
import {
  ACTIVE_ACADEMIC_LEVELS_TAG,
  ACADEMIC_CATALOG_CACHE_SECONDS,
  STUDENT_ACADEMIC_CATALOG_TAG,
  TEACHER_ACADEMIC_CATALOG_TAG,
} from "@/server/content/academic-catalog-cache";

const mocks = vi.hoisted(() => ({
  levelFindMany: vi.fn(),
  subjectFindMany: vi.fn(),
  unstableCache: vi.fn(
    <Arguments extends unknown[], Result>(
      callback: (...args: Arguments) => Promise<Result>,
    ) => callback,
  ),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    level: { findMany: mocks.levelFindMany },
    subject: { findMany: mocks.subjectFindMany },
  },
}));

import {
  getActiveAcademicLevels,
  getPublishedStudentCatalog,
  getPublishedTeacherCatalog,
} from "@/server/content/published-academic-catalog-queries";

describe("published academic catalog cache", () => {
  beforeEach(() => {
    mocks.levelFindMany.mockReset().mockResolvedValue([]);
    mocks.subjectFindMany.mockReset().mockResolvedValue([]);
  });

  it("configures cross-request caches with a bounded fallback TTL", () => {
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["active-academic-levels-v1"],
      {
        revalidate: ACADEMIC_CATALOG_CACHE_SECONDS,
        tags: [ACTIVE_ACADEMIC_LEVELS_TAG],
      },
    );
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["published-student-academic-catalog-v1"],
      {
        revalidate: ACADEMIC_CATALOG_CACHE_SECONDS,
        tags: [STUDENT_ACADEMIC_CATALOG_TAG],
      },
    );
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["published-teacher-academic-catalog-v1"],
      {
        revalidate: ACADEMIC_CATALOG_CACHE_SECONDS,
        tags: [TEACHER_ACADEMIC_CATALOG_TAG],
      },
    );
  });

  it("selects only shared active-level metadata", async () => {
    await getActiveAcademicLevels();

    expect(mocks.levelFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ levelNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
        levelNumber: true,
        description: true,
        requiresSubscription: true,
      },
    });
  });

  it("only selects active, published STUDENT/BOTH catalog metadata", async () => {
    await getPublishedStudentCatalog();

    const query = mocks.levelFindMany.mock.calls[0][0];
    expect(query.where).toEqual({ isActive: true });
    expect(query.select.subjects.where).toEqual({ isActive: true });
    expect(query.select.subjects.select.modules.where).toEqual({
      isActive: true,
      publicationStatus: PublicationStatus.PUBLISHED,
      audience: { in: [ContentAudience.STUDENT, ContentAudience.BOTH] },
    });
    expect(query.select.subjects.select.modules.select.resources.where).toEqual({
      isActive: true,
      publicationStatus: PublicationStatus.PUBLISHED,
    });
    expect(JSON.stringify(query.select)).not.toMatch(
      /userId|progress|savedBy|subscription|payment|refund|storageKey|signedUrl/,
    );
  });

  it("isolates the TEACHER catalog by level and audience", async () => {
    await getPublishedTeacherCatalog("level-7");

    const query = mocks.subjectFindMany.mock.calls[0][0];
    expect(query.where).toEqual({
      levelId: "level-7",
      isActive: true,
      modules: {
        some: {
          isActive: true,
          publicationStatus: PublicationStatus.PUBLISHED,
          audience: { in: [ContentAudience.TEACHER, ContentAudience.BOTH] },
        },
      },
    });
    expect(query.select.modules.where.audience).toEqual({
      in: [ContentAudience.TEACHER, ContentAudience.BOTH],
    });
    expect(query.select.modules.select.resources.where).toEqual({
      isActive: true,
      publicationStatus: PublicationStatus.PUBLISHED,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  updateCatalogModule,
} from "@/server/content/update-content";
import { setCatalogContentAvailability } from "@/server/content/set-content-availability";

const mocks = vi.hoisted(() => ({
  moduleFindUnique: vi.fn(),
  moduleUpdateMany: vi.fn(),
  moduleFindFirst: vi.fn(),
  resourceFindFirst: vi.fn(),
  levelFindUnique: vi.fn(),
  levelUpdateMany: vi.fn(),
  savePublishedModuleRevision: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/content/content-revisions", () => ({
  ContentRevisionError: class ContentRevisionError extends Error {},
  savePublishedModuleRevision: mocks.savePublishedModuleRevision,
  savePublishedResourceRevision: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: {
      findUnique: mocks.moduleFindUnique,
      updateMany: mocks.moduleUpdateMany,
      findFirst: mocks.moduleFindFirst,
    },
    resource: { findFirst: mocks.resourceFindFirst },
    level: {
      findUnique: mocks.levelFindUnique,
      updateMany: mocks.levelUpdateMany,
    },
  },
}));

const input = {
  id: "module-1",
  expectedUpdatedAt: "2026-08-01T18:30:00.000Z",
  title: "Módulo actualizado",
  description: "Descripción",
  audience: "BOTH" as const,
};

describe("content update service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["IN_REVIEW"] as const)(
    "prevents administrators from editing %s modules",
    async (publicationStatus) => {
      mocks.moduleFindUnique.mockResolvedValue({
        createdById: "admin-1",
        publicationStatus,
      });

      await expect(
        updateCatalogModule(input, { id: "admin-1", role: "ADMIN" }),
      ).rejects.toMatchObject({
        code: "INVALID_STATE",
      });
      expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
    },
  );

  it("creates a separate revision for a published module", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      createdById: "collaborator-1",
      publicationStatus: "PUBLISHED",
    });
    mocks.moduleUpdateMany.mockResolvedValue({ count: 1 });
    mocks.savePublishedModuleRevision.mockResolvedValue({ id: "revision-1" });

    await expect(
      updateCatalogModule(input, {
        id: "collaborator-1",
        role: "COLLABORATOR",
      }),
    ).resolves.toEqual({ affectsPublishedContent: false, createdRevision: true });
    expect(mocks.savePublishedModuleRevision).toHaveBeenCalled();
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
  });

  it("lets collaborators edit another author's draft", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      createdById: "collaborator-2",
      publicationStatus: "DRAFT",
    });

    mocks.moduleUpdateMany.mockResolvedValue({ count: 1 });
    await expect(
      updateCatalogModule(input, {
        id: "collaborator-1",
        role: "COLLABORATOR",
      }),
    ).resolves.toEqual({ affectsPublishedContent: false, createdRevision: false });
    expect(mocks.moduleUpdateMany).toHaveBeenCalled();
  });

  it("updates an owned collaborator draft with optimistic concurrency", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      createdById: "collaborator-1",
      publicationStatus: "DRAFT",
    });
    mocks.moduleUpdateMany.mockResolvedValue({ count: 1 });

    await expect(
      updateCatalogModule(input, {
        id: "collaborator-1",
        role: "COLLABORATOR",
      }),
    ).resolves.toEqual({ affectsPublishedContent: false, createdRevision: false });
    expect(mocks.moduleUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: input.id,
          updatedAt: new Date(input.expectedUpdatedAt),
          publicationStatus: "DRAFT",
        }),
      }),
    );
  });

  it("reports a stale edit instead of overwriting newer content", async () => {
    mocks.moduleFindUnique
      .mockResolvedValueOnce({
        createdById: "admin-1",
        publicationStatus: "DRAFT",
      })
      .mockResolvedValueOnce({ id: "module-1" });
    mocks.moduleUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateCatalogModule(input, { id: "admin-1", role: "ADMIN" }),
    ).rejects.toMatchObject({
      code: "EDIT_CONFLICT",
    });
  });

  it("prevents archiving a draft module that has published resources", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      createdById: "collaborator-1",
      publicationStatus: "DRAFT",
      subject: { isActive: true, level: { isActive: true } },
    });
    mocks.resourceFindFirst.mockResolvedValue({ id: "resource-1" });

    await expect(
      setCatalogContentAvailability(
        {
          id: "module-1",
          type: "module",
          isActive: false,
          expectedUpdatedAt: input.expectedUpdatedAt,
        },
        { id: "collaborator-1", role: "COLLABORATOR" },
      ),
    ).rejects.toMatchObject({
      code: "DEPENDENCY_BLOCKED",
    });
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
  });

  it("treats repeated authorized archivings as idempotent", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      isActive: false,
      createdById: "collaborator-1",
      publicationStatus: "DRAFT",
      subject: { isActive: true, level: { isActive: true } },
    });

    await expect(
      setCatalogContentAvailability(
        {
          id: "module-1",
          type: "module",
          isActive: false,
          expectedUpdatedAt: input.expectedUpdatedAt,
        },
        { id: "collaborator-1", role: "COLLABORATOR" },
      ),
    ).resolves.toEqual({ affectsPublishedContent: false });
    expect(mocks.resourceFindFirst).not.toHaveBeenCalled();
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
  });

  it("treats a teammate's repeated authorized archiving as idempotent", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      isActive: false,
      createdById: "collaborator-2",
      publicationStatus: "DRAFT",
      subject: { isActive: true, level: { isActive: true } },
    });

    await expect(
      setCatalogContentAvailability(
        {
          id: "module-1",
          type: "module",
          isActive: false,
          expectedUpdatedAt: input.expectedUpdatedAt,
        },
        { id: "collaborator-1", role: "COLLABORATOR" },
      ),
    ).resolves.toEqual({ affectsPublishedContent: false });
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
  });

  it("lets administrators archive a level with protected editorial content", async () => {
    mocks.levelFindUnique.mockResolvedValue({ id: "level-1", isActive: true });
    mocks.levelUpdateMany.mockResolvedValue({ count: 1 });

    await expect(
      setCatalogContentAvailability(
        {
          id: "level-1",
          type: "level",
          isActive: false,
          expectedUpdatedAt: input.expectedUpdatedAt,
        },
        { id: "admin-1", role: "ADMIN" },
      ),
    ).resolves.toEqual({ affectsPublishedContent: true });
    expect(mocks.moduleFindFirst).not.toHaveBeenCalled();
    expect(mocks.levelUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "level-1",
        updatedAt: new Date(input.expectedUpdatedAt),
      },
      data: { isActive: false },
    });
  });
});

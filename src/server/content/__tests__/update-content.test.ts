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
}));

vi.mock("server-only", () => ({}));

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

  it("updates a published module without changing its publication status", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      createdById: "collaborator-1",
      publicationStatus: "PUBLISHED",
    });
    mocks.moduleUpdateMany.mockResolvedValue({ count: 1 });

    await expect(
      updateCatalogModule(input, {
        id: "collaborator-1",
        role: "COLLABORATOR",
      }),
    ).resolves.toBeUndefined();
    expect(mocks.moduleUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ publicationStatus: "PUBLISHED" }),
      }),
    );
  });

  it("prevents collaborators from editing another author's draft", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      createdById: "collaborator-2",
      publicationStatus: "DRAFT",
    });

    await expect(
      updateCatalogModule(input, {
        id: "collaborator-1",
        role: "COLLABORATOR",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
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
    ).resolves.toBeUndefined();
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
    ).resolves.toBeUndefined();
    expect(mocks.resourceFindFirst).not.toHaveBeenCalled();
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
  });

  it("does not let idempotency bypass ownership checks", async () => {
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
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
  });

  it("prevents archiving a level with protected editorial content", async () => {
    mocks.levelFindUnique.mockResolvedValue({ id: "level-1" });
    mocks.moduleFindFirst.mockResolvedValue({ id: "module-1" });

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
    ).rejects.toMatchObject({
      code: "DEPENDENCY_BLOCKED",
    });
    expect(mocks.levelUpdateMany).not.toHaveBeenCalled();
  });
});

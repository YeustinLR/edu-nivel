import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationStatus, Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  moduleFindUnique: vi.fn(),
  moduleUpdateMany: vi.fn(),
  resourceFindUnique: vi.fn(),
  resourceUpdateMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: {
      findUnique: mocks.moduleFindUnique,
      updateMany: mocks.moduleUpdateMany,
    },
    resource: {
      findUnique: mocks.resourceFindUnique,
      updateMany: mocks.resourceUpdateMany,
    },
  },
}));

import { applyEditorialTransition } from "@/server/content/apply-editorial-transition";

describe("applyEditorialTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.moduleFindUnique.mockResolvedValue({
      id: "module-1",
      createdById: "collaborator-1",
      subjectId: "subject-1",
      publicationStatus: PublicationStatus.DRAFT,
      isActive: true,
    });
    mocks.resourceFindUnique.mockResolvedValue({
      id: "resource-1",
      createdById: "collaborator-1",
      moduleId: "module-1",
      publicationStatus: PublicationStatus.DRAFT,
      isActive: true,
    });
    mocks.moduleUpdateMany.mockResolvedValue({ count: 1 });
    mocks.resourceUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("permite al propietario publicar un módulo directamente", async () => {
    await applyEditorialTransition({
      targetType: "module",
      targetId: "module-1",
      transition: "PUBLISH_DIRECT",
      actor: { id: "collaborator-1", role: Role.COLLABORATOR },
    });

    expect(mocks.moduleUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "module-1",
        publicationStatus: PublicationStatus.DRAFT,
      }),
      data: expect.objectContaining({
        publicationStatus: PublicationStatus.PUBLISHED,
        publishedById: "collaborator-1",
        publishedAt: expect.any(Date),
        reviewedById: null,
      }),
    });
  });

  it("impide que un colaborador publique directamente un recurso", async () => {
    await expect(
      applyEditorialTransition({
        targetType: "resource",
        targetId: "resource-1",
        transition: "PUBLISH_DIRECT",
        actor: { id: "collaborator-1", role: Role.COLLABORATOR },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.resourceUpdateMany).not.toHaveBeenCalled();
  });

  it("permite que un administrador publique un recurso sin revisión", async () => {
    await applyEditorialTransition({
      targetType: "resource",
      targetId: "resource-1",
      transition: "PUBLISH_DIRECT",
      actor: { id: "admin-1", role: Role.ADMIN },
    });

    expect(mocks.resourceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publicationStatus: PublicationStatus.PUBLISHED,
          publishedById: "admin-1",
        }),
      }),
    );
  });

  it("mantiene la revisión disponible para recursos de colaboradores", async () => {
    await applyEditorialTransition({
      targetType: "resource",
      targetId: "resource-1",
      transition: "SUBMIT_FOR_REVIEW",
      actor: { id: "collaborator-1", role: Role.COLLABORATOR },
    });

    expect(mocks.resourceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publicationStatus: PublicationStatus.IN_REVIEW,
          submittedForReviewAt: expect.any(Date),
        }),
      }),
    );
  });

  it("impide publicar contenido archivado", async () => {
    mocks.moduleFindUnique.mockResolvedValueOnce({
      id: "module-1",
      createdById: "collaborator-1",
      subjectId: "subject-1",
      publicationStatus: PublicationStatus.DRAFT,
      isActive: false,
    });

    await expect(
      applyEditorialTransition({
        targetType: "module",
        targetId: "module-1",
        transition: "PUBLISH_DIRECT",
        actor: { id: "admin-1", role: Role.ADMIN },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
      message: "Reactiva el contenido antes de publicarlo.",
    });
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
  });
});

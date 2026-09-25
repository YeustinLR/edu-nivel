import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentRevisionKind,
  ContentRevisionStatus,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  moduleFindUnique: vi.fn(),
  resourceFindUnique: vi.fn(),
  revisionFindUnique: vi.fn(),
  revisionFindFirst: vi.fn(),
  revisionCreate: vi.fn(),
  revisionUpdateMany: vi.fn(),
  revisionDelete: vi.fn(),
  moduleUpdateMany: vi.fn(),
  resourceUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  auditFindMany: vi.fn(),
  syncResourceContentImages: vi.fn(),
}));

const transaction = {
  contentRevision: {
    findUnique: mocks.revisionFindUnique,
    create: mocks.revisionCreate,
    updateMany: mocks.revisionUpdateMany,
    delete: mocks.revisionDelete,
  },
  contentAuditLog: {
    create: mocks.auditCreate,
    findMany: mocks.auditFindMany,
  },
  module: { updateMany: mocks.moduleUpdateMany },
  resource: {
    findUnique: mocks.resourceFindUnique,
    updateMany: mocks.resourceUpdateMany,
  },
  youtubeVideo: { update: vi.fn() },
  linkResource: { update: vi.fn() },
  imageResource: { updateMany: vi.fn() },
  quiz: { update: vi.fn() },
};

vi.mock("server-only", () => ({}));
vi.mock("@/server/content/content-image-references", () => ({
  syncResourceContentImages: mocks.syncResourceContentImages,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: { findUnique: mocks.moduleFindUnique },
    resource: { findUnique: mocks.resourceFindUnique },
    contentRevision: {
      findUnique: mocks.revisionFindUnique,
      findFirst: mocks.revisionFindFirst,
    },
    $transaction: vi.fn((callback) => callback(transaction)),
  },
}));

import {
  savePublishedModuleRevision,
  savePublishedResourceRevision,
  transitionPublishedRevision,
} from "@/server/content/content-revisions";

const baseUpdatedAt = new Date("2026-09-15T15:00:00.000Z");
const revisionUpdatedAt = new Date("2026-09-15T15:05:00.000Z");

function moduleInput(expectedUpdatedAt = baseUpdatedAt.toISOString()) {
  return {
    id: "module-1",
    expectedUpdatedAt,
    title: "Versión revisada",
    description: "Descripción revisada",
    audience: "BOTH" as const,
  };
}

function revision(overrides: Record<string, unknown> = {}) {
  return {
    id: "revision-1",
    kind: ContentRevisionKind.RESOURCE,
    status: ContentRevisionStatus.IN_REVIEW,
    moduleId: null,
    resourceId: "resource-1",
    payload: {
      title: "Recurso revisado",
      instructions: null,
      content: "Contenido nuevo",
      estimatedMinutes: 8,
      videoId: null,
      startAt: null,
      url: null,
      openInNewTab: false,
      altText: null,
      quizQuestions: null,
      passingScore: null,
      maxAttempts: null,
      shuffleQuestions: false,
    },
    baseUpdatedAt,
    createdById: "collaborator-a",
    updatedById: "collaborator-b",
    submittedById: "collaborator-a",
    submittedAt: revisionUpdatedAt,
    reviewedById: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: baseUpdatedAt,
    updatedAt: revisionUpdatedAt,
    ...overrides,
  };
}

describe("content revisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.auditFindMany.mockResolvedValue([]);
    mocks.revisionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.revisionDelete.mockResolvedValue({ id: "revision-1" });
    mocks.moduleUpdateMany.mockResolvedValue({ count: 1 });
    mocks.resourceUpdateMany.mockResolvedValue({ count: 1 });
    mocks.syncResourceContentImages.mockResolvedValue(undefined);
  });

  it("creates and submits a separate revision without changing the published module", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      id: "module-1",
      publicationStatus: PublicationStatus.PUBLISHED,
      updatedAt: baseUpdatedAt,
    });
    mocks.revisionFindUnique.mockResolvedValueOnce(null);
    mocks.revisionCreate.mockResolvedValue(
      revision({
        kind: ContentRevisionKind.MODULE,
        status: ContentRevisionStatus.IN_REVIEW,
        moduleId: "module-1",
        resourceId: null,
      }),
    );

    await savePublishedModuleRevision(moduleInput(), {
      id: "collaborator-a",
      role: Role.COLLABORATOR,
    });

    expect(mocks.revisionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moduleId: "module-1",
          baseUpdatedAt,
          createdById: "collaborator-a",
          status: ContentRevisionStatus.IN_REVIEW,
          submittedById: "collaborator-a",
          submittedAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.moduleUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledTimes(2);
    expect(mocks.auditCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ action: "SUBMIT_FOR_REVIEW" }),
    });
  });

  it("creates and submits a separate revision for a published resource", async () => {
    mocks.resourceFindUnique.mockResolvedValue({
      id: "resource-1",
      publicationStatus: PublicationStatus.PUBLISHED,
      updatedAt: baseUpdatedAt,
      type: ResourceType.NOTE,
    });
    mocks.revisionFindUnique.mockResolvedValueOnce(null);
    mocks.revisionCreate.mockResolvedValue(revision());

    await savePublishedResourceRevision(
      {
        id: "resource-1",
        expectedUpdatedAt: baseUpdatedAt.toISOString(),
        resourceType: ResourceType.NOTE,
        title: "Recurso revisado",
        instructions: "Indicaciones",
        content: "Contenido nuevo",
        estimatedMinutes: 8,
      },
      { id: "collaborator-a", role: Role.COLLABORATOR },
    );

    expect(mocks.revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceId: "resource-1",
        status: ContentRevisionStatus.IN_REVIEW,
        submittedById: "collaborator-a",
        submittedAt: expect.any(Date),
      }),
    });
    expect(mocks.resourceUpdateMany).not.toHaveBeenCalled();
  });

  it("resubmits requested changes and clears the previous review decision", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      id: "module-1",
      publicationStatus: PublicationStatus.PUBLISHED,
      updatedAt: baseUpdatedAt,
    });
    mocks.revisionFindUnique
      .mockResolvedValueOnce(
        revision({
          kind: ContentRevisionKind.MODULE,
          status: ContentRevisionStatus.CHANGES_REQUESTED,
          moduleId: "module-1",
          resourceId: null,
          reviewNote: "Aclara el contenido.",
          reviewedById: "admin-1",
          reviewedAt: revisionUpdatedAt,
        }),
      )
      .mockResolvedValueOnce(
        revision({
          kind: ContentRevisionKind.MODULE,
          status: ContentRevisionStatus.IN_REVIEW,
          moduleId: "module-1",
          resourceId: null,
        }),
      );

    await savePublishedModuleRevision(
      moduleInput(revisionUpdatedAt.toISOString()),
      { id: "collaborator-b", role: Role.COLLABORATOR },
    );

    expect(mocks.revisionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ContentRevisionStatus.IN_REVIEW,
          submittedById: "collaborator-b",
          submittedAt: expect.any(Date),
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
        }),
      }),
    );
  });

  it("does not silently overwrite a concurrent revision edit", async () => {
    mocks.moduleFindUnique.mockResolvedValue({
      id: "module-1",
      publicationStatus: PublicationStatus.PUBLISHED,
      updatedAt: baseUpdatedAt,
    });
    mocks.revisionFindUnique.mockResolvedValueOnce(
      revision({
        kind: ContentRevisionKind.MODULE,
        status: ContentRevisionStatus.DRAFT,
        moduleId: "module-1",
        resourceId: null,
      }),
    );
    mocks.revisionUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      savePublishedModuleRevision(moduleInput(revisionUpdatedAt.toISOString()), {
        id: "collaborator-b",
        role: Role.COLLABORATOR,
      }),
    ).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
  });

  it("records who submits a published revision for review", async () => {
    mocks.revisionFindFirst.mockResolvedValue(
      revision({ status: ContentRevisionStatus.DRAFT }),
    );

    await transitionPublishedRevision({
      targetType: "resource",
      targetId: "resource-1",
      transition: "SUBMIT_FOR_REVIEW",
      actor: { id: "collaborator-b", role: Role.COLLABORATOR },
    });

    expect(mocks.revisionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ContentRevisionStatus.IN_REVIEW,
          submittedById: "collaborator-b",
          submittedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("approves a revision atomically while the base remains published", async () => {
    const pendingRevision = revision();
    mocks.revisionFindFirst.mockResolvedValue(pendingRevision);
    mocks.revisionFindUnique.mockResolvedValueOnce(pendingRevision);
    mocks.resourceFindUnique.mockResolvedValue({ type: ResourceType.NOTE });
    mocks.auditFindMany.mockResolvedValue([
      { actorId: "collaborator-a" },
      { actorId: "collaborator-b" },
    ]);

    await expect(
      transitionPublishedRevision({
        targetType: "resource",
        targetId: "resource-1",
        transition: "PUBLISH",
        actor: { id: "admin-1", role: Role.ADMIN },
      }),
    ).resolves.toEqual({
      outcome: "APPLIED",
      publicationStatus: PublicationStatus.PUBLISHED,
    });

    expect(mocks.resourceUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "resource-1",
        updatedAt: baseUpdatedAt,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
      data: expect.objectContaining({
        title: "Recurso revisado",
        content: "Contenido nuevo",
        updatedById: "collaborator-b",
        reviewedById: "admin-1",
      }),
    });
    expect(mocks.revisionDelete).toHaveBeenCalledWith({
      where: { id: "revision-1" },
    });
  });

  it("requesting changes preserves the current published resource", async () => {
    mocks.revisionFindFirst.mockResolvedValue(revision());

    await transitionPublishedRevision({
      targetType: "resource",
      targetId: "resource-1",
      transition: "REQUEST_CHANGES",
      reviewNote: "Corrige la explicación.",
      actor: { id: "admin-1", role: Role.ADMIN },
    });

    expect(mocks.revisionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ContentRevisionStatus.CHANGES_REQUESTED,
          reviewedById: "admin-1",
        }),
      }),
    );
    expect(mocks.resourceUpdateMany).not.toHaveBeenCalled();
    expect(mocks.revisionDelete).not.toHaveBeenCalled();
  });
});

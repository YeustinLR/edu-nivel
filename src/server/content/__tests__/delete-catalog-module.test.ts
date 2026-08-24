import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  Role,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  initialFindUnique: vi.fn(),
  archiveModule: vi.fn(),
  transaction: vi.fn(),
  lockModule: vi.fn(),
  targetFindUnique: vi.fn(),
  sharedResourceFindMany: vi.fn(),
  deleteUploadIntents: vi.fn(),
  deleteModule: vi.fn(),
  isR2UploadEnabled: vi.fn(),
  deleteR2Object: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/storage/r2", () => ({
  isR2UploadEnabled: mocks.isR2UploadEnabled,
  deleteR2Object: mocks.deleteR2Object,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: {
      findUnique: mocks.initialFindUnique,
      updateMany: mocks.archiveModule,
    },
    resource: { findMany: mocks.sharedResourceFindMany },
    $transaction: mocks.transaction,
  },
}));

import { deleteCatalogModule } from "@/server/content/delete-catalog-module";

const actor = { id: "admin-1", role: Role.ADMIN };
const input = {
  moduleId: "module-1",
  confirmationTitle: "Números naturales",
};

function createTarget(
  overrides: Partial<{
    publicationStatus: PublicationStatus;
    isActive: boolean;
  }> = {},
) {
  return {
    id: "module-1",
    title: "Números naturales",
    subjectId: "subject-1",
    audience: ContentAudience.STUDENT,
    publicationStatus: PublicationStatus.DRAFT,
    isActive: false,
    uploadIntents: [
      {
        temporaryStorageKey: "temporary/module-1/file.pdf",
        permanentStorageKey: "modules/module-1/file.pdf",
      },
    ],
    resources: [
      {
        pdfResource: { storageKey: "modules/module-1/file.pdf" },
        fileResource: null,
        imageResource: { storageKey: "modules/module-1/image.png" },
        audioResource: null,
      },
    ],
    ...overrides,
  };
}

describe("deleteCatalogModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialFindUnique.mockResolvedValue({
      title: "Números naturales",
      publicationStatus: PublicationStatus.DRAFT,
    });
    mocks.archiveModule.mockResolvedValue({ count: 1 });
    mocks.lockModule.mockResolvedValue([{ id: "module-1" }]);
    mocks.targetFindUnique.mockResolvedValue(createTarget());
    mocks.sharedResourceFindMany.mockResolvedValue([]);
    mocks.deleteUploadIntents.mockResolvedValue({ count: 1 });
    mocks.deleteModule.mockResolvedValue({ count: 1 });
    mocks.isR2UploadEnabled.mockReturnValue(true);
    mocks.deleteR2Object.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(
      async (operation: (transactionClient: unknown) => unknown) =>
        operation({
          $queryRaw: mocks.lockModule,
          module: {
            findUnique: mocks.targetFindUnique,
            deleteMany: mocks.deleteModule,
          },
          uploadIntent: { deleteMany: mocks.deleteUploadIntents },
        }),
    );
  });

  it("archives first and permanently deletes the module and its unique R2 objects", async () => {
    await expect(deleteCatalogModule(input, actor)).resolves.toEqual({
      subjectId: "subject-1",
      audience: ContentAudience.STUDENT,
    });

    expect(mocks.archiveModule).toHaveBeenCalledWith({
      where: {
        id: "module-1",
        publicationStatus: {
          in: ["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED"],
        },
      },
      data: { isActive: false },
    });
    expect(mocks.deleteR2Object).toHaveBeenCalledTimes(3);
    expect(mocks.deleteR2Object).toHaveBeenCalledWith(
      "temporary/module-1/file.pdf",
    );
    expect(mocks.deleteR2Object).toHaveBeenCalledWith(
      "modules/module-1/file.pdf",
    );
    expect(mocks.deleteR2Object).toHaveBeenCalledWith(
      "modules/module-1/image.png",
    );
    expect(mocks.deleteUploadIntents).toHaveBeenCalledWith({
      where: { moduleId: "module-1" },
    });
    expect(mocks.deleteModule).toHaveBeenCalledOnce();
  });

  it("rejects published modules before changing data or storage", async () => {
    mocks.initialFindUnique.mockResolvedValueOnce({
      title: "Números naturales",
      publicationStatus: PublicationStatus.PUBLISHED,
    });

    await expect(deleteCatalogModule(input, actor)).rejects.toMatchObject({
      code: "INVALID_STATE",
      message: "Despublica el módulo antes de eliminarlo.",
    });
    expect(mocks.archiveModule).not.toHaveBeenCalled();
    expect(mocks.deleteR2Object).not.toHaveBeenCalled();
  });

  it("requires the exact module title before archiving it", async () => {
    await expect(
      deleteCatalogModule(
        { ...input, confirmationTitle: "Numeros naturales" },
        actor,
      ),
    ).rejects.toMatchObject({ code: "TITLE_MISMATCH" });
    expect(mocks.archiveModule).not.toHaveBeenCalled();
  });

  it("keeps the module archived when R2 cleanup fails", async () => {
    mocks.deleteR2Object.mockRejectedValueOnce(new Error("R2 unavailable"));

    const deletion = deleteCatalogModule(input, actor);

    await expect(deletion).rejects.toMatchObject({
      code: "STORAGE_CLEANUP_FAILED",
    });
    expect(mocks.archiveModule).toHaveBeenCalled();
    expect(mocks.deleteUploadIntents).not.toHaveBeenCalled();
    expect(mocks.deleteModule).not.toHaveBeenCalled();
  });

  it("deletes database records without storage calls when R2 is disabled", async () => {
    mocks.isR2UploadEnabled.mockReturnValueOnce(false);

    await deleteCatalogModule(input, actor);

    expect(mocks.deleteR2Object).not.toHaveBeenCalled();
    expect(mocks.deleteModule).toHaveBeenCalledOnce();
  });

  it("reserves permanent deletion for administrators", async () => {
    await expect(
      deleteCatalogModule(input, {
        id: "collaborator-1",
        role: Role.COLLABORATOR,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.initialFindUnique).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationStatus, Role, UploadStatus } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  moduleFindUnique: vi.fn(),
  imageCreate: vi.fn(),
  imageDelete: vi.fn(),
  imageFindUnique: vi.fn(),
  imageFindUniqueOrThrow: vi.fn(),
  imageUpdate: vi.fn(),
  imageUpdateMany: vi.fn(),
  enabled: vi.fn(),
  presign: vi.fn(),
  head: vi.fn(),
  copy: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/storage/r2", () => ({
  isR2UploadEnabled: mocks.enabled,
  createPresignedUploadUrl: mocks.presign,
  headR2Object: mocks.head,
  copyR2Object: mocks.copy,
  deleteR2Object: mocks.remove,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: { findUnique: mocks.moduleFindUnique },
    contentImage: {
      create: mocks.imageCreate,
      delete: mocks.imageDelete,
      findUnique: mocks.imageFindUnique,
      findUniqueOrThrow: mocks.imageFindUniqueOrThrow,
      update: mocks.imageUpdate,
      updateMany: mocks.imageUpdateMany,
    },
  },
}));

import {
  confirmContentImage,
  createContentImageIntent,
} from "@/server/content/content-images";

const pendingImage = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  createdById: "author-1",
  editorSessionId: "session-1",
  temporaryStorageKey: "pending/content-images/image/file.png",
  storageKey: "content-images/image/file.png",
  originalName: "grafico.png",
  mimeType: "image/png",
  sizeBytes: BigInt(1_024),
  status: UploadStatus.PENDING,
  uploadExpiresAt: new Date(Date.now() + 60_000),
};

describe("content image uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enabled.mockReturnValue(true);
    mocks.requireRole.mockResolvedValue({ id: "author-1", role: Role.COLLABORATOR });
    mocks.moduleFindUnique.mockResolvedValue({
      createdById: "author-1",
      publicationStatus: PublicationStatus.DRAFT,
      isActive: true,
      subject: { isActive: true, level: { isActive: true } },
    });
    mocks.imageCreate.mockImplementation(({ data }) => ({ ...data, uploadExpiresAt: data.uploadExpiresAt }));
    mocks.presign.mockResolvedValue("https://upload.test");
    mocks.imageFindUnique.mockResolvedValue(pendingImage);
    mocks.imageFindUniqueOrThrow.mockResolvedValue(pendingImage);
    mocks.imageUpdateMany.mockResolvedValue({ count: 1 });
    mocks.imageUpdate.mockResolvedValue(pendingImage);
    mocks.head.mockResolvedValue({
      ETag: '"etag"',
      ContentType: "image/png",
      ContentLength: 1_024,
    });
    mocks.copy.mockResolvedValue({});
    mocks.remove.mockResolvedValue(undefined);
  });

  it("creates a short-lived upload intent after checking module permissions", async () => {
    const result = await createContentImageIntent({
      editorSessionId: "session-1",
      moduleId: "module-1",
      originalName: "grafico.png",
      mimeType: "image/png",
      sizeBytes: 1_024,
    });
    expect(result.uploadUrl).toBe("https://upload.test");
    expect(mocks.imageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: "author-1",
        editorSessionId: "session-1",
        mimeType: "image/png",
      }),
    });
  });

  it("verifies and confirms the R2 object", async () => {
    await expect(confirmContentImage(pendingImage.id)).resolves.toEqual({
      state: "CONFIRMED",
      imageId: pendingImage.id,
    });
    expect(mocks.copy).toHaveBeenCalledWith(
      expect.objectContaining({ sourceEtag: '"etag"' }),
    );
    expect(mocks.imageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: pendingImage.id },
        data: expect.objectContaining({ status: UploadStatus.CONFIRMED }),
      }),
    );
  });

  it("does not allow a collaborator to confirm another author's image", async () => {
    mocks.imageFindUnique.mockResolvedValue({
      ...pendingImage,
      createdById: "another-author",
    });
    await expect(confirmContentImage(pendingImage.id)).rejects.toMatchObject({
      code: "IMAGE_FORBIDDEN",
      status: 403,
    });
    expect(mocks.head).not.toHaveBeenCalled();
  });
});

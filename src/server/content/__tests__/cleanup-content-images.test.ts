import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadStatus } from "@/generated/prisma/enums";
import {
  normalizeResourceDocument,
  serializeResourceDocument,
} from "@/modules/content/domain/resource-document";

const imageId = "550e8400-e29b-41d4-a716-446655440000";
const content = serializeResourceDocument(
  normalizeResourceDocument([
    {
      id: "image-block",
      type: "image",
      props: { imageId, altText: "Gráfico", decorative: false },
      children: [],
    },
  ]),
);

const mocks = vi.hoisted(() => ({
  imageFindMany: vi.fn(),
  imageFindUnique: vi.fn(),
  imageUpdateMany: vi.fn(),
  imageUpdate: vi.fn(),
  imageDelete: vi.fn(),
  revisionFindMany: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/storage/r2", () => ({
  deleteR2Object: mocks.deleteObject,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    contentImage: {
      findMany: mocks.imageFindMany,
      findUnique: mocks.imageFindUnique,
      updateMany: mocks.imageUpdateMany,
      update: mocks.imageUpdate,
      delete: mocks.imageDelete,
    },
    contentRevision: { findMany: mocks.revisionFindMany },
  },
}));

import { cleanupExpiredContentImages } from "@/server/content/cleanup-content-images";

describe("cleanupExpiredContentImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.imageFindMany.mockResolvedValue([{ id: imageId }]);
    mocks.revisionFindMany.mockResolvedValue([
      { payload: { content } },
    ]);
    mocks.imageUpdateMany.mockResolvedValue({ count: 1 });
    mocks.imageFindUnique.mockResolvedValue({
      id: imageId,
      status: UploadStatus.CONFIRMED,
      temporaryStorageKey: "pending/content-images/image.png",
      storageKey: "content-images/image.png",
      orphanExpiresAt: new Date(0),
      resources: [],
    });
    mocks.imageUpdate.mockResolvedValue({ id: imageId });
    mocks.deleteObject.mockResolvedValue(undefined);
  });

  it("keeps an expired orphan that is referenced by an active revision", async () => {
    await expect(cleanupExpiredContentImages()).resolves.toMatchObject({
      examined: 1,
      cleaned: 0,
      skipped: 1,
    });

    expect(mocks.deleteObject).toHaveBeenCalledWith(
      "pending/content-images/image.png",
    );
    expect(mocks.deleteObject).not.toHaveBeenCalledWith(
      "content-images/image.png",
    );
    expect(mocks.imageDelete).not.toHaveBeenCalled();
    expect(mocks.imageUpdate).toHaveBeenCalledWith({
      where: { id: imageId },
      data: expect.objectContaining({
        status: UploadStatus.CONFIRMED,
        orphanExpiresAt: expect.any(Date),
        cleanupLeaseUntil: null,
      }),
    });
  });
});

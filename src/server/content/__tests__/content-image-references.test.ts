import { describe, expect, it, vi } from "vitest";

import { normalizeResourceDocument, serializeResourceDocument } from "@/modules/content/domain/resource-document";

vi.mock("server-only", () => ({}));

import {
  ContentImageReferenceError,
  syncResourceContentImages,
} from "@/server/content/content-image-references";

const imageId = "550e8400-e29b-41d4-a716-446655440000";
const content = serializeResourceDocument(
  normalizeResourceDocument([
    {
      id: "image-block",
      type: "image",
      props: {
        imageId,
        altText: "Recta numérica",
        decorative: false,
      },
      children: [],
    },
  ]),
);

function transaction() {
  return {
    resourceContentImage: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(0),
    },
    contentImage: {
      findMany: vi.fn().mockResolvedValue([{ id: imageId }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({ id: imageId }),
    },
  };
}

describe("syncResourceContentImages", () => {
  it("claims confirmed images owned by the editor session", async () => {
    const tx = transaction();
    await syncResourceContentImages(tx as never, {
      resourceId: "resource-1",
      editorSessionId: "session-1",
      actorId: "author-1",
      content,
      isNewResource: true,
    });

    expect(tx.contentImage.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: { in: [imageId] },
        createdById: "author-1",
        editorSessionId: "session-1",
      }),
      select: { id: true },
    });
    expect(tx.resourceContentImage.createMany).toHaveBeenCalledWith({
      data: [{ resourceId: "resource-1", contentImageId: imageId }],
      skipDuplicates: true,
    });
  });

  it("rejects unavailable or foreign image identifiers", async () => {
    const tx = transaction();
    tx.contentImage.findMany.mockResolvedValue([]);
    await expect(
      syncResourceContentImages(tx as never, {
        resourceId: "resource-1",
        editorSessionId: "session-1",
        actorId: "author-1",
        content,
        isNewResource: true,
      }),
    ).rejects.toBeInstanceOf(ContentImageReferenceError);
    expect(tx.resourceContentImage.createMany).not.toHaveBeenCalled();
  });

  it("releases removed images only when no resource still references them", async () => {
    const tx = transaction();
    tx.resourceContentImage.findMany.mockResolvedValue([
      { contentImageId: imageId },
    ]);
    await syncResourceContentImages(tx as never, {
      resourceId: "resource-1",
      editorSessionId: "resource-1",
      actorId: "author-1",
      content: null,
    });
    expect(tx.resourceContentImage.deleteMany).toHaveBeenCalled();
    expect(tx.contentImage.update).toHaveBeenCalledWith({
      where: { id: imageId },
      data: { orphanExpiresAt: expect.any(Date) },
    });
  });
});

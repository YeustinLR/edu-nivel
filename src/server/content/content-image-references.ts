import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { UploadStatus } from "@/generated/prisma/enums";
import { getResourceDocumentImageIds } from "@/modules/content/domain/resource-document";

const ORPHAN_TTL_MS = 24 * 60 * 60 * 1_000;

export class ContentImageReferenceError extends Error {
  constructor(message = "Una imagen del contenido no está disponible o no te pertenece.") {
    super(message);
    this.name = "ContentImageReferenceError";
  }
}

export async function syncResourceContentImages(
  transaction: Prisma.TransactionClient,
  input: {
    resourceId: string;
    editorSessionId: string;
    actorId: string;
    content: string | null | undefined;
    isNewResource?: boolean;
  },
) {
  const requestedIds = getResourceDocumentImageIds(input.content);
  const current = input.isNewResource
    ? []
    : await transaction.resourceContentImage.findMany({
        where: { resourceId: input.resourceId },
        select: { contentImageId: true },
      });
  const currentIds = new Set(current.map((entry) => entry.contentImageId));
  const additions = requestedIds.filter((id) => !currentIds.has(id));
  const removals = [...currentIds].filter((id) => !requestedIds.includes(id));

  if (additions.length) {
    const available = await transaction.contentImage.findMany({
      where: {
        id: { in: additions },
        createdById: input.actorId,
        editorSessionId: input.editorSessionId,
        status: { in: [UploadStatus.CONFIRMED, UploadStatus.CLEANUP_PENDING] },
        orphanExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (available.length !== additions.length) {
      throw new ContentImageReferenceError();
    }
    await transaction.resourceContentImage.createMany({
      data: additions.map((contentImageId) => ({
        resourceId: input.resourceId,
        contentImageId,
      })),
      skipDuplicates: true,
    });
    await transaction.contentImage.updateMany({
      where: { id: { in: additions } },
      data: { orphanExpiresAt: null },
    });
  }

  if (removals.length) {
    await transaction.resourceContentImage.deleteMany({
      where: { resourceId: input.resourceId, contentImageId: { in: removals } },
    });
    for (const contentImageId of removals) {
      const references = await transaction.resourceContentImage.count({
        where: { contentImageId },
      });
      if (references === 0) {
        await transaction.contentImage.update({
          where: { id: contentImageId },
          data: { orphanExpiresAt: new Date(Date.now() + ORPHAN_TTL_MS) },
        });
      }
    }
  }
}

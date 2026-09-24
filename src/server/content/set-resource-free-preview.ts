import "server-only";

import type { ResourceFreePreviewInput } from "@/modules/content/schemas/content-edit.schema";
import { prisma } from "@/server/db/prisma";
import { ContentUpdateError } from "@/server/content/update-content";

export async function setResourceFreePreview(
  input: ResourceFreePreviewInput,
) {
  const resource = await prisma.resource.findUnique({
    where: { id: input.id },
    select: { publicationStatus: true },
  });
  if (!resource) {
    throw new ContentUpdateError("NOT_FOUND", "El recurso ya no existe.");
  }

  const updated = await prisma.resource.updateMany({
    where: {
      id: input.id,
      updatedAt: new Date(input.expectedUpdatedAt),
    },
    data: { isFreePreview: input.isFreePreview },
  });
  if (updated.count !== 1) {
    throw new ContentUpdateError(
      "EDIT_CONFLICT",
      "El recurso cambió mientras lo editabas. Actualiza la página e inténtalo de nuevo.",
    );
  }

  return {
    affectsPublishedContent: resource.publicationStatus === "PUBLISHED",
  };
}

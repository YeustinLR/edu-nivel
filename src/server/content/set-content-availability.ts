import "server-only";

import {
  canArchiveEditorialContent,
  canManageCatalogStructure,
  canReactivateEditorialContent,
} from "@/modules/content/domain/content-permissions";
import type { ContentAvailabilityInput } from "@/modules/content/schemas/content-edit.schema";
import { prisma } from "@/server/db/prisma";
import {
  ContentUpdateError,
  type ContentUpdateActor,
} from "@/server/content/update-content";

const protectedStatuses = ["IN_REVIEW", "PUBLISHED"] as const;

function assertCatalogManager(actor: ContentUpdateActor) {
  if (!canManageCatalogStructure(actor)) {
    throw new ContentUpdateError(
      "FORBIDDEN",
      "Solo un administrador puede modificar niveles y materias.",
    );
  }
}

async function updateAvailabilityWithConcurrency(
  input: ContentAvailabilityInput,
) {
  const where = {
    id: input.id,
    updatedAt: new Date(input.expectedUpdatedAt),
  };
  const data = { isActive: input.isActive };

  const result =
    input.type === "level"
      ? await prisma.level.updateMany({ where, data })
      : input.type === "subject"
        ? await prisma.subject.updateMany({ where, data })
        : input.type === "module"
          ? await prisma.module.updateMany({ where, data })
          : await prisma.resource.updateMany({ where, data });

  if (result.count !== 1) {
    throw new ContentUpdateError(
      "EDIT_CONFLICT",
      "La disponibilidad cambió. Actualiza la página e inténtalo nuevamente.",
    );
  }
}

export async function setCatalogContentAvailability(
  input: ContentAvailabilityInput,
  actor: ContentUpdateActor,
) {
  if (input.type === "level") {
    assertCatalogManager(actor);
    const level = await prisma.level.findUnique({
      where: { id: input.id },
      select: { id: true, isActive: true },
    });
    if (!level) {
      throw new ContentUpdateError("NOT_FOUND", "El nivel ya no existe.");
    }
    if (level.isActive === input.isActive) return;

    if (!input.isActive) {
      const protectedContent = await prisma.module.findFirst({
        where: {
          subject: { levelId: input.id },
          OR: [
            { publicationStatus: { in: [...protectedStatuses] } },
            {
              resources: {
                some: { publicationStatus: { in: [...protectedStatuses] } },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (protectedContent) {
        throw new ContentUpdateError(
          "DEPENDENCY_BLOCKED",
          "Despublica o retira de revisión el contenido del nivel antes de archivarlo.",
        );
      }
    }
  } else if (input.type === "subject") {
    assertCatalogManager(actor);
    const subject = await prisma.subject.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        isActive: true,
        level: { select: { isActive: true } },
      },
    });
    if (!subject) {
      throw new ContentUpdateError("NOT_FOUND", "La materia ya no existe.");
    }
    if (subject.isActive === input.isActive) return;
    if (input.isActive && !subject.level.isActive) {
      throw new ContentUpdateError(
        "PARENT_INACTIVE",
        "Activa primero el nivel de esta materia.",
      );
    }
    if (!input.isActive) {
      const protectedContent = await prisma.module.findFirst({
        where: {
          subjectId: input.id,
          OR: [
            { publicationStatus: { in: [...protectedStatuses] } },
            {
              resources: {
                some: { publicationStatus: { in: [...protectedStatuses] } },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (protectedContent) {
        throw new ContentUpdateError(
          "DEPENDENCY_BLOCKED",
          "Despublica o retira de revisión el contenido de la materia antes de archivarla.",
        );
      }
    }
  } else if (input.type === "module") {
    const moduleRecord = await prisma.module.findUnique({
      where: { id: input.id },
      select: {
        isActive: true,
        createdById: true,
        publicationStatus: true,
        subject: {
          select: { isActive: true, level: { select: { isActive: true } } },
        },
      },
    });
    if (!moduleRecord) {
      throw new ContentUpdateError("NOT_FOUND", "El módulo ya no existe.");
    }
    const permitted = input.isActive
      ? canReactivateEditorialContent(actor, moduleRecord)
      : canArchiveEditorialContent(actor, moduleRecord);
    if (!permitted) {
      throw new ContentUpdateError(
        "INVALID_STATE",
        "No puedes cambiar la disponibilidad de este módulo en su estado actual.",
      );
    }
    if (moduleRecord.isActive === input.isActive) return;
    if (
      input.isActive &&
      (!moduleRecord.subject.isActive || !moduleRecord.subject.level.isActive)
    ) {
      throw new ContentUpdateError(
        "PARENT_INACTIVE",
        "Activa primero el nivel y la materia del módulo.",
      );
    }
    if (!input.isActive) {
      const protectedResource = await prisma.resource.findFirst({
        where: {
          moduleId: input.id,
          publicationStatus: { in: [...protectedStatuses] },
        },
        select: { id: true },
      });
      if (protectedResource) {
        throw new ContentUpdateError(
          "DEPENDENCY_BLOCKED",
          "Despublica o retira de revisión los recursos antes de archivar el módulo.",
        );
      }
    }
  } else {
    const resource = await prisma.resource.findUnique({
      where: { id: input.id },
      select: {
        isActive: true,
        createdById: true,
        publicationStatus: true,
        module: {
          select: {
            isActive: true,
            subject: {
              select: { isActive: true, level: { select: { isActive: true } } },
            },
          },
        },
      },
    });
    if (!resource) {
      throw new ContentUpdateError("NOT_FOUND", "El recurso ya no existe.");
    }
    const permitted = input.isActive
      ? canReactivateEditorialContent(actor, resource)
      : canArchiveEditorialContent(actor, resource);
    if (!permitted) {
      throw new ContentUpdateError(
        "INVALID_STATE",
        "No puedes cambiar la disponibilidad de este recurso en su estado actual.",
      );
    }
    if (resource.isActive === input.isActive) return;
    if (
      input.isActive &&
      (!resource.module.isActive ||
        !resource.module.subject.isActive ||
        !resource.module.subject.level.isActive)
    ) {
      throw new ContentUpdateError(
        "PARENT_INACTIVE",
        "Activa primero el nivel, la materia y el módulo del recurso.",
      );
    }
  }

  await updateAvailabilityWithConcurrency(input);
}


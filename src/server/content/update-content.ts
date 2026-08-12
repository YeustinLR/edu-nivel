import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { ResourceType, type Role } from "@/generated/prisma/enums";
import {
  canEditEditorialContent,
  canEditModuleContent,
  canManageCatalogStructure,
  type ContentPermissionActor,
} from "@/modules/content/domain/content-permissions";
import type {
  UpdateLevelInput,
  UpdateModuleInput,
  UpdateResourceInput,
  UpdateSubjectInput,
} from "@/modules/content/schemas/content-edit.schema";
import { prisma } from "@/server/db/prisma";

export type ContentUpdateErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "EDIT_CONFLICT"
  | "DUPLICATE"
  | "PARENT_INACTIVE"
  | "DEPENDENCY_BLOCKED"
  | "INVALID_RESOURCE_DATA";

export class ContentUpdateError extends Error {
  constructor(
    public readonly code: ContentUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ContentUpdateError";
  }
}

export type ContentUpdateActor = {
  id: string;
  role: Role;
};

function actorForPolicy(actor: ContentUpdateActor): ContentPermissionActor {
  return actor;
}

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

function assertCatalogManager(actor: ContentUpdateActor) {
  if (!canManageCatalogStructure(actorForPolicy(actor))) {
    throw new ContentUpdateError(
      "FORBIDDEN",
      "Solo un administrador puede modificar niveles y materias.",
    );
  }
}

function assertEditable(
  actor: ContentUpdateActor,
  target: { createdById: string; publicationStatus: Parameters<typeof canEditEditorialContent>[1]["publicationStatus"] },
) {
  if (
    actor.role === "COLLABORATOR" &&
    target.createdById !== actor.id
  ) {
    throw new ContentUpdateError(
      "FORBIDDEN",
      "Solo puedes editar contenido creado por ti.",
    );
  }

  if (!canEditEditorialContent(actorForPolicy(actor), target)) {
    throw new ContentUpdateError(
      "INVALID_STATE",
      "Retira el contenido de revisión o despublícalo antes de editarlo.",
    );
  }
}

function assertModuleEditable(
  actor: ContentUpdateActor,
  target: Parameters<typeof canEditModuleContent>[1],
) {
  if (!canEditModuleContent(actorForPolicy(actor), target)) {
    throw new ContentUpdateError(
      actor.role === "COLLABORATOR" && target.createdById !== actor.id
        ? "FORBIDDEN"
        : "INVALID_STATE",
      actor.role === "COLLABORATOR" && target.createdById !== actor.id
        ? "Solo puedes editar módulos creados por ti."
        : "El módulo no puede editarse en su estado actual.",
    );
  }
}

async function assertSingleUpdate(
  count: number,
  exists: () => Promise<boolean>,
) {
  if (count === 1) return;

  if (!(await exists())) {
    throw new ContentUpdateError("NOT_FOUND", "El contenido ya no existe.");
  }

  throw new ContentUpdateError(
    "EDIT_CONFLICT",
    "El contenido cambió mientras lo editabas. Actualiza la página e inténtalo nuevamente.",
  );
}

export async function updateCatalogLevel(
  input: UpdateLevelInput,
  actor: ContentUpdateActor,
) {
  assertCatalogManager(actor);

  try {
    const updated = await prisma.level.updateMany({
      where: { id: input.id, updatedAt: new Date(input.expectedUpdatedAt) },
      data: {
        levelNumber: input.levelNumber,
        description: input.description ?? null,
        requiresSubscription: input.requiresSubscription,
      },
    });

    await assertSingleUpdate(updated.count, async () =>
      Boolean(
        await prisma.level.findUnique({
          where: { id: input.id },
          select: { id: true },
        }),
      ),
    );
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ContentUpdateError(
        "DUPLICATE",
        "Ya existe un nivel con ese número.",
      );
    }
    throw error;
  }
}

export async function updateCatalogSubject(
  input: UpdateSubjectInput,
  actor: ContentUpdateActor,
) {
  assertCatalogManager(actor);

  try {
    const updated = await prisma.subject.updateMany({
      where: { id: input.id, updatedAt: new Date(input.expectedUpdatedAt) },
      data: {
        name: input.name,
        description: input.description ?? null,
      },
    });

    await assertSingleUpdate(updated.count, async () =>
      Boolean(
        await prisma.subject.findUnique({
          where: { id: input.id },
          select: { id: true },
        }),
      ),
    );
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ContentUpdateError(
        "DUPLICATE",
        "Ya existe una materia con ese nombre dentro del nivel.",
      );
    }
    throw error;
  }
}

export async function updateCatalogModule(
  input: UpdateModuleInput,
  actor: ContentUpdateActor,
) {
  const moduleRecord = await prisma.module.findUnique({
    where: { id: input.id },
    select: { createdById: true, publicationStatus: true },
  });

  if (!moduleRecord) {
    throw new ContentUpdateError("NOT_FOUND", "El módulo ya no existe.");
  }
  assertModuleEditable(actor, moduleRecord);

  try {
    const updated = await prisma.module.updateMany({
      where: {
        id: input.id,
        updatedAt: new Date(input.expectedUpdatedAt),
        publicationStatus: moduleRecord.publicationStatus,
      },
      data: {
        title: input.title,
        description: input.description ?? null,
        audience: input.audience,
      },
    });

    await assertSingleUpdate(updated.count, async () =>
      Boolean(
        await prisma.module.findUnique({
          where: { id: input.id },
          select: { id: true },
        }),
      ),
    );
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ContentUpdateError(
        "DUPLICATE",
        "Ya existe un módulo con ese título dentro de la materia.",
      );
    }
    throw error;
  }
}

export async function updateCatalogResource(
  input: UpdateResourceInput,
  actor: ContentUpdateActor,
) {
  const resource = await prisma.resource.findUnique({
    where: { id: input.id },
    select: {
      createdById: true,
      publicationStatus: true,
      type: true,
      lesson: { select: { id: true } },
      didacticResource: { select: { id: true } },
      youtubeVideo: { select: { id: true } },
      linkResource: { select: { id: true } },
    },
  });

  if (!resource) {
    throw new ContentUpdateError("NOT_FOUND", "El recurso ya no existe.");
  }
  assertEditable(actor, resource);

  if (resource.type !== input.resourceType) {
    throw new ContentUpdateError(
      "INVALID_RESOURCE_DATA",
      "El tipo del recurso cambió. Actualiza la página e inténtalo nuevamente.",
    );
  }

  if (
    (resource.type === ResourceType.LESSON ||
      resource.type === ResourceType.DIDACTIC) &&
    !input.content?.trim()
  ) {
    throw new ContentUpdateError(
      "INVALID_RESOURCE_DATA",
      "El contenido del recurso es obligatorio.",
    );
  }

  if (resource.type === ResourceType.YOUTUBE && !input.videoId) {
    throw new ContentUpdateError(
      "INVALID_RESOURCE_DATA",
      "El video de YouTube es obligatorio.",
    );
  }

  if (resource.type === ResourceType.LINK && !input.url) {
    throw new ContentUpdateError(
      "INVALID_RESOURCE_DATA",
      "La URL del recurso es obligatoria.",
    );
  }

  await prisma.$transaction(async (transaction) => {
    let updated;

    try {
      updated = await transaction.resource.updateMany({
        where: {
          id: input.id,
          updatedAt: new Date(input.expectedUpdatedAt),
          publicationStatus: resource.publicationStatus,
        },
        data: {
          title: input.title,
          description: input.description ?? null,
        },
      });
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        throw new ContentUpdateError(
          "DUPLICATE",
          "Ya existe un recurso con ese título.",
        );
      }
      throw error;
    }

    if (updated.count !== 1) {
      throw new ContentUpdateError(
        "EDIT_CONFLICT",
        "El recurso cambió mientras lo editabas. Actualiza la página e inténtalo nuevamente.",
      );
    }

    if (resource.type === ResourceType.LESSON) {
      if (!resource.lesson) {
        throw new ContentUpdateError(
          "INVALID_RESOURCE_DATA",
          "La lección no tiene datos asociados.",
        );
      }
      await transaction.lesson.update({
        where: { resourceId: input.id },
        data: {
          content: input.content?.trim() ?? "",
          estimatedMinutes: input.estimatedMinutes ?? null,
        },
      });
    }

    if (resource.type === ResourceType.DIDACTIC) {
      if (!resource.didacticResource) {
        throw new ContentUpdateError(
          "INVALID_RESOURCE_DATA",
          "El material didáctico no tiene datos asociados.",
        );
      }
      await transaction.didacticResource.update({
        where: { resourceId: input.id },
        data: {
          content: input.content?.trim() ?? "",
          objective: input.objective?.trim() || null,
        },
      });
    }

    if (resource.type === ResourceType.YOUTUBE) {
      if (!resource.youtubeVideo) {
        throw new ContentUpdateError(
          "INVALID_RESOURCE_DATA",
          "El recurso de YouTube no tiene datos asociados.",
        );
      }
      await transaction.youtubeVideo.update({
        where: { resourceId: input.id },
        data: {
          videoId: input.videoId ?? "",
          startAt: input.startAt ?? 0,
        },
      });
    }

    if (resource.type === ResourceType.LINK) {
      if (!resource.linkResource) {
        throw new ContentUpdateError(
          "INVALID_RESOURCE_DATA",
          "El enlace no tiene datos asociados.",
        );
      }
      await transaction.linkResource.update({
        where: { resourceId: input.id },
        data: {
          url: input.url ?? "",
          openInNewTab: input.openInNewTab ?? false,
        },
      });
    }

    if (resource.type === ResourceType.IMAGE) {
      await transaction.imageResource.updateMany({
        where: { resourceId: input.id },
        data: { altText: input.altText?.trim() || null },
      });
    }
  });
}

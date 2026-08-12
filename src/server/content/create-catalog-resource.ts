import "server-only";

import { cache } from "react";

import { Prisma } from "@/generated/prisma/client";
import { PublicationStatus, ResourceType } from "@/generated/prisma/enums";
import {
  canCreateResource,
  type ContentPermissionActor,
} from "@/modules/content/domain/content-permissions";
import { getResourceCreationStatus } from "@/modules/content/domain/content-creation";
import type { CreateAdminStructuredResourceInput } from "@/modules/content/schemas/admin-resource-creation.schema";
import { prisma } from "@/server/db/prisma";

export type ResourceCreationErrorCode =
  | "MODULE_NOT_FOUND"
  | "MODULE_NOT_AVAILABLE"
  | "MODULE_NOT_EDITABLE"
  | "INVALID_DISPOSITION"
  | "REQUEST_CONFLICT";

export class ResourceCreationError extends Error {
  constructor(
    public readonly code: ResourceCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ResourceCreationError";
  }
}

export const getResourceCreationContext = cache(
  async (moduleId: string, expectedSubjectId?: string) =>
    prisma.module.findFirst({
      where: {
        id: moduleId,
        ...(expectedSubjectId ? { subjectId: expectedSubjectId } : {}),
      },
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        isActive: true,
        subject: {
          select: {
            id: true,
            name: true,
            isActive: true,
            level: {
              select: { id: true, levelNumber: true, isActive: true },
            },
          },
        },
      },
    }),
);

export type ResourceCreationContext = NonNullable<
  Awaited<ReturnType<typeof getResourceCreationContext>>
>;

type ExistingResource = Awaited<ReturnType<typeof findExistingResource>>;

function findExistingResource(resourceId: string) {
  return prisma.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      moduleId: true,
      type: true,
      title: true,
      description: true,
      createdById: true,
      lesson: { select: { content: true, estimatedMinutes: true } },
      didacticResource: { select: { content: true, objective: true } },
      youtubeVideo: { select: { videoId: true, startAt: true } },
      linkResource: { select: { url: true, openInNewTab: true } },
    },
  });
}

function isMatchingRequest(
  existing: NonNullable<ExistingResource>,
  input: CreateAdminStructuredResourceInput,
  actorId: string,
) {
  if (
    existing.moduleId !== input.moduleId ||
    existing.createdById !== actorId ||
    existing.type !== input.resourceType ||
    existing.title !== input.title ||
    existing.description !== (input.description ?? null)
  ) {
    return false;
  }

  switch (input.resourceType) {
    case ResourceType.NOTE:
      return true;
    case ResourceType.LESSON:
      return (
        existing.lesson?.content === input.content &&
        existing.lesson.estimatedMinutes === (input.estimatedMinutes ?? null)
      );
    case ResourceType.DIDACTIC:
      return (
        existing.didacticResource?.content === input.content &&
        existing.didacticResource.objective === (input.objective ?? null)
      );
    case ResourceType.YOUTUBE:
      return (
        existing.youtubeVideo?.videoId === input.videoId &&
        existing.youtubeVideo.startAt === (input.startAt ?? 0)
      );
    case ResourceType.LINK:
      return (
        existing.linkResource?.url === input.url &&
        existing.linkResource.openInNewTab === input.openInNewTab
      );
  }
}

function assertMatchingRequest(
  existing: ExistingResource,
  input: CreateAdminStructuredResourceInput,
  actorId: string,
) {
  if (!existing || !isMatchingRequest(existing, input, actorId)) {
    throw new ResourceCreationError(
      "REQUEST_CONFLICT",
      "La solicitud de creación ya fue utilizada con otros datos.",
    );
  }

  return { id: existing.id, title: existing.title, type: existing.type };
}

function buildResourceData(
  input: CreateAdminStructuredResourceInput,
  actorId: string,
  publicationStatus: PublicationStatus,
): Prisma.ResourceCreateInput {
  const now = new Date();
  return {
    id: input.requestId,
    type: input.resourceType,
    title: input.title,
    description: input.description ?? null,
    publicationStatus,
    submittedForReviewAt:
      publicationStatus === PublicationStatus.IN_REVIEW ? now : null,
    publishedAt:
      publicationStatus === PublicationStatus.PUBLISHED ? now : null,
    publishedBy:
      publicationStatus === PublicationStatus.PUBLISHED
        ? { connect: { id: actorId } }
        : undefined,
    module: { connect: { id: input.moduleId } },
    createdBy: { connect: { id: actorId } },
    lesson:
      input.resourceType === ResourceType.LESSON
        ? {
            create: {
              content: input.content,
              estimatedMinutes: input.estimatedMinutes ?? null,
            },
          }
        : undefined,
    didacticResource:
      input.resourceType === ResourceType.DIDACTIC
        ? {
            create: {
              content: input.content,
              objective: input.objective ?? null,
            },
          }
        : undefined,
    youtubeVideo:
      input.resourceType === ResourceType.YOUTUBE
        ? {
            create: {
              videoId: input.videoId,
              startAt: input.startAt ?? 0,
            },
          }
        : undefined,
    linkResource:
      input.resourceType === ResourceType.LINK
        ? {
            create: {
              url: input.url,
              openInNewTab: input.openInNewTab,
            },
          }
        : undefined,
  };
}

export async function createCatalogStructuredResource(
  input: CreateAdminStructuredResourceInput,
  actor: ContentPermissionActor,
) {
  const publicationStatus = getResourceCreationStatus(
    actor.role,
    input.disposition,
  );
  if (!publicationStatus) {
    throw new ResourceCreationError(
      "INVALID_DISPOSITION",
      "La acción de creación no está permitida para tu rol.",
    );
  }

  const moduleRecord = await prisma.module.findUnique({
    where: { id: input.moduleId },
    select: {
      id: true,
      createdById: true,
      publicationStatus: true,
      isActive: true,
      subject: {
        select: { isActive: true, level: { select: { isActive: true } } },
      },
    },
  });

  if (!moduleRecord) {
    throw new ResourceCreationError(
      "MODULE_NOT_FOUND",
      "El módulo seleccionado ya no existe.",
    );
  }

  if (
    !moduleRecord.isActive ||
    !moduleRecord.subject.isActive ||
    !moduleRecord.subject.level.isActive
  ) {
    throw new ResourceCreationError(
      "MODULE_NOT_AVAILABLE",
      "El módulo o su jerarquía están inactivos.",
    );
  }

  if (!canCreateResource(actor, moduleRecord)) {
    throw new ResourceCreationError(
      "MODULE_NOT_EDITABLE",
      "No puedes añadir recursos en el estado editorial actual del módulo.",
    );
  }

  const existing = await findExistingResource(input.requestId);
  if (existing) return assertMatchingRequest(existing, input, actor.id);

  try {
    return await prisma.$transaction(async (transaction) =>
      transaction.resource.create({
        data: buildResourceData(input, actor.id, publicationStatus),
        select: { id: true, title: true, type: true },
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return assertMatchingRequest(
        await findExistingResource(input.requestId),
        input,
        actor.id,
      );
    }

    throw error;
  }
}

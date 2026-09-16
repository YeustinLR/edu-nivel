import "server-only";

import { cache } from "react";
import { isDeepStrictEqual } from "node:util";

import { Prisma } from "@/generated/prisma/client";
import { PublicationStatus, ResourceType } from "@/generated/prisma/enums";
import {
  canCreateResource,
  type ContentPermissionActor,
} from "@/modules/content/domain/content-permissions";
import { getResourceCreationStatus } from "@/modules/content/domain/content-creation";
import { normalizeResourceContentForStorage } from "@/modules/content/domain/resource-document";
import type { CreateAdminStructuredResourceInput } from "@/modules/content/schemas/admin-resource-creation.schema";
import {
  ContentImageReferenceError,
  syncResourceContentImages,
} from "@/server/content/content-image-references";
import { prisma } from "@/server/db/prisma";

export type ResourceCreationErrorCode =
  | "MODULE_NOT_FOUND"
  | "MODULE_NOT_AVAILABLE"
  | "MODULE_NOT_EDITABLE"
  | "INVALID_CONTENT_IMAGE"
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
        revisions: { take: 1, select: { status: true } },
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
      instructions: true,
      content: true,
      estimatedMinutes: true,
      createdById: true,
      quiz: {
        select: {
          passingScore: true,
          maxAttempts: true,
          shuffleQuestions: true,
          questions: true,
        },
      },
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
    existing.instructions !== (input.instructions ?? null) ||
    existing.content !== (input.content ?? null) ||
    existing.estimatedMinutes !== (input.estimatedMinutes ?? null)
  ) {
    return false;
  }

  switch (input.resourceType) {
    case ResourceType.NOTE:
      return true;
    case ResourceType.QUIZ:
      return (
        existing.quiz?.passingScore === input.passingScore &&
        existing.quiz.maxAttempts === input.maxAttempts &&
        existing.quiz.shuffleQuestions === input.shuffleQuestions &&
        isDeepStrictEqual(existing.quiz.questions, input.questions)
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
    instructions: input.instructions ?? null,
    content: input.content ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    publicationStatus,
    submittedForReviewAt:
      publicationStatus === PublicationStatus.IN_REVIEW ? now : null,
    submittedBy:
      publicationStatus === PublicationStatus.IN_REVIEW
        ? { connect: { id: actorId } }
        : undefined,
    publishedAt:
      publicationStatus === PublicationStatus.PUBLISHED ? now : null,
    publishedBy:
      publicationStatus === PublicationStatus.PUBLISHED
        ? { connect: { id: actorId } }
        : undefined,
    module: { connect: { id: input.moduleId } },
    createdBy: { connect: { id: actorId } },
    updatedBy: { connect: { id: actorId } },
    youtubeVideo:
      input.resourceType === ResourceType.YOUTUBE
        ? {
            create: {
              videoId: input.videoId,
              startAt: input.startAt ?? 0,
            },
          }
        : undefined,
    quiz:
      input.resourceType === ResourceType.QUIZ
        ? {
            create: {
              passingScore: input.passingScore,
              maxAttempts: input.maxAttempts,
              shuffleQuestions: input.shuffleQuestions,
              questions: input.questions as Prisma.InputJsonValue,
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
  input = {
    ...input,
    content: normalizeResourceContentForStorage(input.content) ?? undefined,
  } as CreateAdminStructuredResourceInput;
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
      subjectId: true,
      createdById: true,
      publicationStatus: true,
      isActive: true,
      subject: {
        select: { isActive: true, level: { select: { isActive: true } } },
      },
      revisions: { take: 1, select: { status: true } },
    },
  });

  if (!moduleRecord) {
    throw new ResourceCreationError(
      "MODULE_NOT_FOUND",
      "El módulo seleccionado ya no existe.",
    );
  }

  if (
    input.expectedSubjectId &&
    moduleRecord.subjectId !== input.expectedSubjectId
  ) {
    throw new ResourceCreationError(
      "MODULE_NOT_FOUND",
      "El módulo no pertenece a la materia seleccionada.",
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

  if (
    moduleRecord.revisions?.[0]?.status === "IN_REVIEW" ||
    !canCreateResource(actor, moduleRecord)
  ) {
    throw new ResourceCreationError(
      "MODULE_NOT_EDITABLE",
      "No puedes añadir recursos en el estado editorial actual del módulo.",
    );
  }

  const existing = await findExistingResource(input.requestId);
  if (existing) return assertMatchingRequest(existing, input, actor.id);

  try {
    return await prisma.$transaction(async (transaction) => {
      const resource = await transaction.resource.create({
        data: buildResourceData(input, actor.id, publicationStatus),
        select: { id: true, title: true, type: true },
      });
      await syncResourceContentImages(transaction, {
        resourceId: resource.id,
        editorSessionId: input.requestId,
        actorId: actor.id,
        content: input.content,
        isNewResource: true,
      });
      return resource;
    });
  } catch (error) {
    if (error instanceof ContentImageReferenceError) {
      throw new ResourceCreationError("INVALID_CONTENT_IMAGE", error.message);
    }
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

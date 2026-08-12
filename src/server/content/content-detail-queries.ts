import "server-only";

import type {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";
import {
  canArchiveEditorialContent,
  canEditEditorialContent,
  canEditModuleContent,
  canReactivateEditorialContent,
  canViewContentBody,
} from "@/modules/content/domain/content-permissions";
import { prisma } from "@/server/db/prisma";
import { isR2UploadEnabled } from "@/server/storage/r2";

export type ContentDetailActor = { id: string; role: Role };

export type ResourceContentDetail = {
  id: string;
  moduleId: string;
  type: ResourceType;
  title: string;
  description: string | null;
  publicationStatus: PublicationStatus;
  isActive: boolean;
  createdById: string;
  authorName: string;
  updatedAt: Date;
  protectedFileAccessEnabled: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canReactivate: boolean;
  lesson: { content: string; estimatedMinutes: number | null } | null;
  didactic: { content: string; objective: string | null } | null;
  youtube: {
    videoId: string;
    duration: number | null;
    startAt: number | null;
    endAt: number | null;
  } | null;
  link: { url: string; openInNewTab: boolean } | null;
  pdf: {
    originalName: string;
    mimeType: string;
    sizeBytes: string | null;
    pageCount: number | null;
  } | null;
  image: {
    originalName: string;
    mimeType: string;
    sizeBytes: string | null;
    width: number | null;
    height: number | null;
    altText: string | null;
    caption: string | null;
  } | null;
  file: {
    originalName: string;
    mimeType: string;
    sizeBytes: string | null;
  } | null;
  audio: {
    originalName: string;
    mimeType: string;
    sizeBytes: string | null;
    duration: number | null;
    transcript: string | null;
  } | null;
  quiz: {
    passingScore: number;
    maxAttempts: number | null;
    shuffleQuestions: boolean;
  } | null;
  game: { gameType: string } | null;
};

export type LevelEditorData = {
  id: string;
  levelNumber: number;
  description: string | null;
  requiresSubscription: boolean;
  isActive: boolean;
  updatedAt: Date;
};

export type SubjectEditorData = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  updatedAt: Date;
  levelNumber: number;
  levelIsActive: boolean;
};

export type ModuleEditorData = {
  id: string;
  title: string;
  description: string | null;
  audience: ContentAudience;
  publicationStatus: PublicationStatus;
  createdById: string;
  authorName: string;
  isActive: boolean;
  updatedAt: Date;
  canEdit: boolean;
  canArchive: boolean;
  canReactivate: boolean;
};

export async function getLevelEditorData(
  levelId: string,
): Promise<LevelEditorData | null> {
  return prisma.level.findUnique({
    where: { id: levelId },
    select: {
      id: true,
      levelNumber: true,
      description: true,
      requiresSubscription: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function getSubjectEditorData(
  subjectId: string,
): Promise<SubjectEditorData | null> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      updatedAt: true,
      level: { select: { levelNumber: true, isActive: true } },
    },
  });

  return subject
    ? {
        ...subject,
        levelNumber: subject.level.levelNumber,
        levelIsActive: subject.level.isActive,
      }
    : null;
}

export async function getModuleEditorData(
  moduleId: string,
  actor: ContentDetailActor,
): Promise<ModuleEditorData | null> {
  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      title: true,
      description: true,
      audience: true,
      publicationStatus: true,
      createdById: true,
      isActive: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      subject: {
        select: { isActive: true, level: { select: { isActive: true } } },
      },
    },
  });

  if (!moduleRecord) return null;
  const permissionTarget = {
    createdById: moduleRecord.createdById,
    publicationStatus: moduleRecord.publicationStatus,
  };

  return {
    id: moduleRecord.id,
    title: moduleRecord.title,
    description: moduleRecord.description,
    audience: moduleRecord.audience,
    publicationStatus: moduleRecord.publicationStatus,
    createdById: moduleRecord.createdById,
    authorName: moduleRecord.createdBy.name,
    isActive: moduleRecord.isActive,
    updatedAt: moduleRecord.updatedAt,
    canEdit: canEditModuleContent(actor, permissionTarget),
    canArchive: canArchiveEditorialContent(actor, permissionTarget),
    canReactivate:
      canReactivateEditorialContent(actor, permissionTarget) &&
      moduleRecord.subject.isActive &&
      moduleRecord.subject.level.isActive,
  };
}

export async function getResourceContentDetail({
  resourceId,
  expectedModuleId,
  actor,
}: {
  resourceId: string;
  expectedModuleId?: string;
  actor: ContentDetailActor;
}): Promise<ResourceContentDetail | null> {
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      ...(expectedModuleId ? { moduleId: expectedModuleId } : {}),
    },
    select: {
      id: true,
      moduleId: true,
      type: true,
      title: true,
      description: true,
      publicationStatus: true,
      isActive: true,
      createdById: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      module: {
        select: {
          createdById: true,
          isActive: true,
          publicationStatus: true,
          subject: {
            select: {
              isActive: true,
              level: {
                select: {
                  isActive: true,
                },
              },
            },
          },
        },
      },
      lesson: { select: { content: true, estimatedMinutes: true } },
      didacticResource: { select: { content: true, objective: true } },
      youtubeVideo: {
        select: { videoId: true, duration: true, startAt: true, endAt: true },
      },
      linkResource: { select: { url: true, openInNewTab: true } },
      pdfResource: {
        select: {
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          pageCount: true,
        },
      },
      imageResource: {
        select: {
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          width: true,
          height: true,
          altText: true,
          caption: true,
        },
      },
      fileResource: {
        select: { originalName: true, mimeType: true, sizeBytes: true },
      },
      audioResource: {
        select: {
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          duration: true,
          transcript: true,
        },
      },
      quiz: {
        select: {
          passingScore: true,
          maxAttempts: true,
          shuffleQuestions: true,
        },
      },
      gameResource: { select: { gameType: true } },
    },
  });

  if (!resource) return null;

  const visibilityTarget = {
    createdById: resource.createdById,
    moduleCreatedById: resource.module.createdById,
    publicationStatus: resource.publicationStatus,
    isActive: resource.isActive,
    moduleIsActive: resource.module.isActive,
    subjectIsActive: resource.module.subject.isActive,
    levelIsActive: resource.module.subject.level.isActive,
    modulePublicationStatus: resource.module.publicationStatus,
  };

  if (!canViewContentBody(actor, visibilityTarget)) return null;

  const permissionTarget = {
    createdById: resource.createdById,
    publicationStatus: resource.publicationStatus,
  };
  const serializeSize = (value: bigint | null) => value?.toString() ?? null;

  return {
    id: resource.id,
    moduleId: resource.moduleId,
    type: resource.type,
    title: resource.title,
    description: resource.description,
    publicationStatus: resource.publicationStatus,
    isActive: resource.isActive,
    createdById: resource.createdById,
    authorName: resource.createdBy.name,
    updatedAt: resource.updatedAt,
    protectedFileAccessEnabled: isR2UploadEnabled(),
    canEdit: canEditEditorialContent(actor, permissionTarget),
    canArchive: canArchiveEditorialContent(actor, permissionTarget),
    canReactivate:
      canReactivateEditorialContent(actor, permissionTarget) &&
      resource.module.isActive &&
      resource.module.subject.isActive &&
      resource.module.subject.level.isActive,
    lesson: resource.lesson,
    didactic: resource.didacticResource,
    youtube: resource.youtubeVideo,
    link: resource.linkResource,
    pdf: resource.pdfResource
      ? {
          ...resource.pdfResource,
          sizeBytes: serializeSize(resource.pdfResource.sizeBytes),
        }
      : null,
    image: resource.imageResource
      ? {
          ...resource.imageResource,
          sizeBytes: serializeSize(resource.imageResource.sizeBytes),
        }
      : null,
    file: resource.fileResource
      ? {
          ...resource.fileResource,
          sizeBytes: serializeSize(resource.fileResource.sizeBytes),
        }
      : null,
    audio: resource.audioResource
      ? {
          ...resource.audioResource,
          sizeBytes: serializeSize(resource.audioResource.sizeBytes),
        }
      : null,
    quiz: resource.quiz,
    game: resource.gameResource,
  };
}

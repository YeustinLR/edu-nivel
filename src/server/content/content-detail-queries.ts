import "server-only";

import type {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
  ContentRevisionStatus,
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
import { quizQuestionsSchema, type QuizQuestion } from "@/modules/content/domain/quiz";
import {
  getModuleContentRevision,
  getResourceContentRevision,
} from "@/server/content/content-revisions";

export type ContentDetailActor = { id: string; role: Role };

export type ResourceContentDetail = {
  id: string;
  moduleId: string;
  moduleTitle: string;
  type: ResourceType;
  title: string;
  instructions: string | null;
  content: string | null;
  estimatedMinutes: number | null;
  isRequired: boolean;
  publicationStatus: PublicationStatus;
  isActive: boolean;
  createdById: string;
  authorName: string;
  updatedAt: Date;
  protectedFileAccessEnabled: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canReactivate: boolean;
  revisionStatus: ContentRevisionStatus | null;
  lastEditorName: string;
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
    questionCount: number;
    questions: QuizQuestion[];
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
  revisionStatus: ContentRevisionStatus | null;
  lastEditorName: string;
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
      updatedBy: { select: { name: true } },
      subject: {
        select: { isActive: true, level: { select: { isActive: true } } },
      },
    },
  });

  if (!moduleRecord) return null;
  const revision = moduleRecord.publicationStatus === "PUBLISHED"
    ? await getModuleContentRevision(moduleId)
    : null;
  const workingRevision = actor.role === "COLLABORATOR" ? revision : null;
  const permissionTarget = {
    createdById: moduleRecord.createdById,
    publicationStatus: workingRevision?.status ?? moduleRecord.publicationStatus,
  };
  const basePermissionTarget = {
    createdById: moduleRecord.createdById,
    publicationStatus: moduleRecord.publicationStatus,
  };

  return {
    id: moduleRecord.id,
    title: workingRevision?.payload.title ?? moduleRecord.title,
    description: workingRevision?.payload.description ?? moduleRecord.description,
    audience: workingRevision?.payload.audience ?? moduleRecord.audience,
    publicationStatus: moduleRecord.publicationStatus,
    createdById: moduleRecord.createdById,
    authorName: moduleRecord.createdBy.name,
    isActive: moduleRecord.isActive,
    updatedAt: workingRevision?.updatedAt ?? moduleRecord.updatedAt,
    canEdit: canEditModuleContent(actor, permissionTarget),
    canArchive: canArchiveEditorialContent(actor, basePermissionTarget),
    canReactivate:
      canReactivateEditorialContent(actor, permissionTarget) &&
      moduleRecord.subject.isActive &&
      moduleRecord.subject.level.isActive,
    revisionStatus: revision?.status ?? null,
    lastEditorName: revision?.updatedBy.name ?? moduleRecord.updatedBy?.name ?? moduleRecord.createdBy.name,
  };
}

export async function getResourceContentDetail({
  resourceId,
  expectedModuleId,
  expectedSubjectId,
  actor,
  preferRevision = false,
}: {
  resourceId: string;
  expectedModuleId?: string;
  expectedSubjectId?: string;
  actor: ContentDetailActor;
  preferRevision?: boolean;
}): Promise<ResourceContentDetail | null> {
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      ...(expectedModuleId ? { moduleId: expectedModuleId } : {}),
      ...(expectedSubjectId
        ? { module: { subjectId: expectedSubjectId } }
        : {}),
    },
    select: {
      id: true,
      moduleId: true,
      type: true,
      title: true,
      instructions: true,
      content: true,
      estimatedMinutes: true,
      isRequired: true,
      publicationStatus: true,
      isActive: true,
      createdById: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      module: {
        select: {
          title: true,
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
          questions: true,
        },
      },
      gameResource: { select: { gameType: true } },
    },
  });

  if (!resource) return null;

  const revision = resource.publicationStatus === "PUBLISHED"
    ? await getResourceContentRevision(resourceId)
    : null;
  const workingRevision = revision && (actor.role === "COLLABORATOR" || preferRevision)
    ? revision
    : null;

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
    publicationStatus: workingRevision?.status ?? resource.publicationStatus,
  };
  const basePermissionTarget = {
    createdById: resource.createdById,
    publicationStatus: resource.publicationStatus,
  };
  const canEdit = canEditEditorialContent(actor, permissionTarget);
  const quizQuestions = resource.quiz
    ? quizQuestionsSchema.safeParse(resource.quiz.questions)
    : null;
  const serializeSize = (value: bigint | null) => value?.toString() ?? null;

  return {
    id: resource.id,
    moduleId: resource.moduleId,
    moduleTitle: resource.module.title,
    type: resource.type,
    title: workingRevision?.payload.title ?? resource.title,
    instructions: workingRevision?.payload.instructions ?? resource.instructions,
    content: workingRevision?.payload.content ?? resource.content,
    estimatedMinutes: workingRevision?.payload.estimatedMinutes ?? resource.estimatedMinutes,
    isRequired: resource.isRequired,
    publicationStatus: resource.publicationStatus,
    isActive: resource.isActive,
    createdById: resource.createdById,
    authorName: resource.createdBy.name,
    updatedAt: workingRevision?.updatedAt ?? resource.updatedAt,
    protectedFileAccessEnabled: isR2UploadEnabled(),
    canEdit,
    canArchive: canArchiveEditorialContent(actor, basePermissionTarget),
    canReactivate:
      canReactivateEditorialContent(actor, permissionTarget) &&
      resource.module.isActive &&
      resource.module.subject.isActive &&
      resource.module.subject.level.isActive,
    revisionStatus: revision?.status ?? null,
    lastEditorName: revision?.updatedBy.name ?? resource.updatedBy?.name ?? resource.createdBy.name,
    youtube: resource.youtubeVideo
      ? {
          ...resource.youtubeVideo,
          videoId: workingRevision?.payload.videoId ?? resource.youtubeVideo.videoId,
          startAt: workingRevision?.payload.startAt ?? resource.youtubeVideo.startAt,
        }
      : null,
    link: resource.linkResource
      ? {
          ...resource.linkResource,
          url: workingRevision?.payload.url ?? resource.linkResource.url,
          openInNewTab: workingRevision?.payload.openInNewTab ?? resource.linkResource.openInNewTab,
        }
      : null,
    pdf: resource.pdfResource
      ? {
          ...resource.pdfResource,
          sizeBytes: serializeSize(resource.pdfResource.sizeBytes),
        }
      : null,
    image: resource.imageResource
      ? {
          ...resource.imageResource,
          altText: workingRevision?.payload.altText ?? resource.imageResource.altText,
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
    quiz: resource.quiz
      ? {
          ...resource.quiz,
          passingScore: workingRevision?.payload.passingScore ?? resource.quiz.passingScore,
          maxAttempts: workingRevision?.payload.maxAttempts ?? resource.quiz.maxAttempts,
          shuffleQuestions: workingRevision?.payload.shuffleQuestions ?? resource.quiz.shuffleQuestions,
          questionCount: workingRevision?.payload.quizQuestions?.length ?? (quizQuestions?.success ? quizQuestions.data.length : 0),
          questions:
            workingRevision?.payload.quizQuestions
              ? (workingRevision.payload.quizQuestions as QuizQuestion[])
              : quizQuestions?.success && (actor.role === "ADMIN" || canEdit)
                ? quizQuestions.data
                : [],
        }
      : null,
    game: resource.gameResource,
  };
}

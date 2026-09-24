import "server-only";

import { Role } from "@/generated/prisma/enums";
import {
  canOpenLearnerResource,
  getLearnerResourceAccessMode,
} from "@/modules/content/domain/learner-resource-access";
import type {
  StudentContentModule,
  StudentContentResourceDetail,
  StudentContentSubject,
  StudentContentWorkspaceData,
} from "@/modules/content/types/student-content";
import { getPremiumAccessDecision, requireRole } from "@/server/auth/guards";
import {
  getVisibleLearnerModuleWhere,
  getVisibleLearnerResourceTreeWhere,
  getVisibleLearnerResourceWhere,
} from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";
import { isR2UploadEnabled } from "@/server/storage/r2";

function studentContentHref(subjectId?: string, resourceId?: string) {
  const parameters = new URLSearchParams();
  if (subjectId) parameters.set("subject", subjectId);
  if (resourceId) parameters.set("resource", resourceId);
  const query = parameters.toString();
  return `/dashboard/student/content${query ? `?${query}` : ""}`;
}

function serializeSize(value: bigint | null) {
  return value?.toString() ?? null;
}

export async function getStudentContentCanonicalHref({
  requestedSubjectId,
  requestedResourceId,
}: {
  requestedSubjectId?: string;
  requestedResourceId?: string;
}): Promise<string | null> {
  const user = await requireRole(Role.STUDENT);
  if (!user.selectedLevelId) return null;

  const access = await getPremiumAccessDecision(user.selectedLevelId);

  const moduleWhere = getVisibleLearnerModuleWhere(Role.STUDENT);
  const resourceWhere = getVisibleLearnerResourceWhere();
  const subjects = await prisma.subject.findMany({
    where: { levelId: user.selectedLevelId, isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      modules: {
        where: moduleWhere,
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          resources: {
            where: resourceWhere,
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: { id: true, isFreePreview: true },
          },
        },
      },
    },
  });

  const requestedSubject = requestedSubjectId
    ? subjects.find((subject) => subject.id === requestedSubjectId) ?? null
    : null;
  const firstSubjectWithAccessibleResources = subjects.find((subject) =>
    subject.modules.some((moduleRecord) =>
      moduleRecord.resources.some(
        (resource) => access.decision.allowed || resource.isFreePreview,
      ),
    ),
  );
  const firstSubjectWithResources =
    subjects.find((subject) =>
      subject.modules.some((moduleRecord) => moduleRecord.resources.length > 0),
    ) ?? subjects[0] ?? null;
  const selectedSubject =
    requestedSubject ??
    firstSubjectWithAccessibleResources ??
    firstSubjectWithResources;
  const resources =
    selectedSubject?.modules.flatMap((moduleRecord) => moduleRecord.resources) ??
    [];
  const requestedResource = requestedResourceId
    ? resources.find((resource) => resource.id === requestedResourceId) ?? null
    : null;
  const selectedResource =
    requestedResource ??
    resources.find(
      (resource) => access.decision.allowed || resource.isFreePreview,
    ) ??
    resources[0] ??
    null;

  return studentContentHref(selectedSubject?.id, selectedResource?.id);
}

export async function getStudentContentWorkspace({
  requestedSubjectId,
  requestedResourceId,
}: {
  requestedSubjectId?: string;
  requestedResourceId?: string;
}): Promise<StudentContentWorkspaceData> {
  const user = await requireRole(Role.STUDENT);
  if (!user.selectedLevelId) return { status: "NO_LEVEL" };

  const selectedLevel = await prisma.level.findFirst({
    where: { id: user.selectedLevelId },
    select: {
      id: true,
      levelNumber: true,
      description: true,
      requiresSubscription: true,
      isActive: true,
    },
  });
  if (!selectedLevel) return { status: "NO_LEVEL" };

  const access = await getPremiumAccessDecision(selectedLevel.id);
  if (!selectedLevel.isActive && !access.decision.allowed) {
    return {
      status: "LOCKED",
      level: selectedLevel,
      denialCode: access.decision.code,
    };
  }

  const moduleWhere = getVisibleLearnerModuleWhere(Role.STUDENT);
  const resourceWhere = getVisibleLearnerResourceWhere();
  const subjectRows = await prisma.subject.findMany({
    where: { levelId: selectedLevel.id, isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      modules: {
        where: moduleWhere,
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          resources: {
            where: resourceWhere,
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              title: true,
              type: true,
              isFreePreview: true,
              estimatedMinutes: true,
              youtubeVideo: { select: { duration: true } },
              audioResource: { select: { duration: true } },
              progress: {
                where: { userId: user.id },
                take: 1,
                select: { completed: true },
              },
            },
          },
        },
      },
    },
  });

  const hasLevelAccess = access.decision.allowed;
  const subjects: StudentContentSubject[] = subjectRows.map((subject) => ({
    id: subject.id,
    name: subject.name,
    description: subject.description,
    href: studentContentHref(subject.id),
    modules: subject.modules.map(
      (moduleRecord): StudentContentModule => ({
        id: moduleRecord.id,
        title: moduleRecord.title,
        description: moduleRecord.description,
        resources: moduleRecord.resources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          type: resource.type,
          estimatedMinutes: resource.estimatedMinutes,
          durationSeconds:
            resource.youtubeVideo?.duration ??
            resource.audioResource?.duration ??
            null,
          started: resource.progress.length > 0,
          completed: resource.progress[0]?.completed ?? false,
          accessMode: getLearnerResourceAccessMode({
            levelRequiresSubscription: selectedLevel.requiresSubscription,
            isFreePreview: resource.isFreePreview,
            hasLevelAccess,
          }),
          href: studentContentHref(subject.id, resource.id),
        })),
      }),
    ),
  }));

  const requestedSubject = requestedSubjectId
    ? subjects.find((subject) => subject.id === requestedSubjectId) ?? null
    : null;
  const firstSubjectWithAccessibleResources = subjects.find((subject) =>
    subject.modules.some((moduleRecord) =>
      moduleRecord.resources.some((resource) =>
        canOpenLearnerResource(resource.accessMode),
      ),
    ),
  );
  const firstSubjectWithResources =
    subjects.find((subject) =>
      subject.modules.some((moduleRecord) => moduleRecord.resources.length > 0),
    ) ?? subjects[0] ?? null;
  const selectedSubject =
    requestedSubject ??
    firstSubjectWithAccessibleResources ??
    firstSubjectWithResources;
  const requestedSubjectUnavailable = Boolean(
    requestedSubjectId && !requestedSubject,
  );
  const flattenedResources =
    selectedSubject?.modules.flatMap((moduleRecord) =>
      moduleRecord.resources.map((resource) => ({
        ...resource,
        moduleId: moduleRecord.id,
      })),
    ) ?? [];
  const requestedResource = requestedResourceId
    ? flattenedResources.find((resource) => resource.id === requestedResourceId) ??
      null
    : null;
  const selectedResourceSummary =
    requestedResource ??
    flattenedResources.find((resource) =>
      canOpenLearnerResource(resource.accessMode),
    ) ??
    flattenedResources[0] ??
    null;
  const requestedResourceUnavailable = Boolean(
    requestedResourceId && !requestedResource,
  );

  let selectedResource: StudentContentResourceDetail | null = null;
  if (
    selectedSubject &&
    selectedResourceSummary &&
    canOpenLearnerResource(selectedResourceSummary.accessMode)
  ) {
    const resource = await prisma.resource.findFirst({
      where: {
        ...getVisibleLearnerResourceTreeWhere({
          role: Role.STUDENT,
          levelId: selectedLevel.id,
          resourceId: selectedResourceSummary.id,
          subjectId: selectedSubject.id,
        }),
      },
      select: {
        id: true,
        type: true,
        title: true,
        instructions: true,
        content: true,
        estimatedMinutes: true,
        isRequired: true,
        youtubeVideo: {
          select: {
            videoId: true,
            duration: true,
            startAt: true,
            endAt: true,
          },
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
            _count: {
              select: { attempts: { where: { userId: user.id } } },
            },
            attempts: {
              where: { userId: user.id },
              orderBy: { startedAt: "desc" },
              take: 5,
              select: {
                id: true,
                status: true,
                questionCount: true,
                correctAnswers: true,
                percentage: true,
                passed: true,
                startedAt: true,
                submittedAt: true,
              },
            },
          },
        },
        gameResource: { select: { gameType: true } },
        savedBy: {
          where: { userId: user.id },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (resource) {
      selectedResource = {
        id: resource.id,
        type: resource.type,
        title: resource.title,
        instructions: resource.instructions,
        content: resource.content,
        estimatedMinutes: resource.estimatedMinutes,
        isRequired: resource.isRequired,
        isSaved: resource.savedBy.length > 0,
        isCompleted: selectedResourceSummary.completed,
        accessMode: selectedResourceSummary.accessMode,
        protectedFileAccessEnabled: isR2UploadEnabled(),
        youtube: resource.youtubeVideo,
        link: resource.linkResource,
        pdf: resource.pdfResource
          ? {
              originalName: resource.pdfResource.originalName,
              mimeType: resource.pdfResource.mimeType,
              sizeBytes: serializeSize(resource.pdfResource.sizeBytes),
              pageCount: resource.pdfResource.pageCount,
            }
          : null,
        image: resource.imageResource
          ? {
              originalName: resource.imageResource.originalName,
              mimeType: resource.imageResource.mimeType,
              sizeBytes: serializeSize(resource.imageResource.sizeBytes),
              width: resource.imageResource.width,
              height: resource.imageResource.height,
              altText: resource.imageResource.altText,
              caption: resource.imageResource.caption,
            }
          : null,
        file: resource.fileResource
          ? {
              originalName: resource.fileResource.originalName,
              mimeType: resource.fileResource.mimeType,
              sizeBytes: serializeSize(resource.fileResource.sizeBytes),
            }
          : null,
        audio: resource.audioResource
          ? {
              originalName: resource.audioResource.originalName,
              mimeType: resource.audioResource.mimeType,
              sizeBytes: serializeSize(resource.audioResource.sizeBytes),
              duration: resource.audioResource.duration,
              transcript: resource.audioResource.transcript,
            }
          : null,
        quiz: resource.quiz
          ? {
              passingScore: resource.quiz.passingScore,
              maxAttempts: resource.quiz.maxAttempts,
              shuffleQuestions: resource.quiz.shuffleQuestions,
              attemptsUsed: resource.quiz._count.attempts,
              recentAttempts: resource.quiz.attempts.map((attempt) => ({
                ...attempt,
                startedAt: attempt.startedAt.toISOString(),
                submittedAt: attempt.submittedAt?.toISOString() ?? null,
              })),
            }
          : null,
        game: resource.gameResource,
      };
    }
  }

  const effectiveResourceId = selectedResourceSummary?.id ?? null;
  const accessibleResources = flattenedResources.filter((resource) =>
    canOpenLearnerResource(resource.accessMode),
  );
  const resourceIndex = effectiveResourceId
    ? accessibleResources.findIndex((resource) => resource.id === effectiveResourceId)
    : -1;
  const selectedModule = effectiveResourceId
    ? selectedSubject?.modules.find((moduleRecord) =>
        moduleRecord.resources.some(
          (resource) => resource.id === effectiveResourceId,
        ),
      ) ?? null
    : null;
  const accessibleModuleResources =
    selectedModule?.resources.filter((resource) =>
      canOpenLearnerResource(resource.accessMode),
    ) ?? [];
  const moduleResourceIndex =
    selectedModule && effectiveResourceId
      ? accessibleModuleResources.findIndex(
          (resource) => resource.id === effectiveResourceId,
        )
      : -1;
  const navigationTarget = (index: number) => {
    const target = accessibleResources[index];
    return target
      ? { id: target.id, title: target.title, href: target.href }
      : null;
  };
  return {
    status: "READY",
    level: selectedLevel,
    subjects,
    selectedSubjectId: selectedSubject?.id ?? null,
    selectedModuleId: selectedModule?.id ?? null,
    selectedResourceId: effectiveResourceId,
    selectedResourceAccessMode: selectedResourceSummary?.accessMode ?? null,
    selectedResource,
    previous: resourceIndex > 0 ? navigationTarget(resourceIndex - 1) : null,
    next:
      resourceIndex >= 0 && resourceIndex < accessibleResources.length - 1
        ? navigationTarget(resourceIndex + 1)
        : null,
    resourcePosition: resourceIndex >= 0 ? resourceIndex + 1 : 0,
    resourceCount: accessibleResources.length,
    moduleResourcePosition:
      moduleResourceIndex >= 0 ? moduleResourceIndex + 1 : 0,
    moduleResourceCount: accessibleModuleResources.length,
    requestedSubjectUnavailable,
    requestedResourceUnavailable,
  };
}

import "server-only";

import { cache } from "react";

import {
  ContentAudience,
  PublicationStatus,
  Role,
} from "@/generated/prisma/enums";
import type {
  LearnerContinueTarget,
  LearnerDashboardData,
  LearnerResourceSummary,
  LearnerRole,
  LearnerSearchItem,
} from "@/modules/dashboard/types/learner-dashboard";
import { getPremiumAccessDecision, requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

const audiencesByRole = {
  [Role.STUDENT]: [ContentAudience.STUDENT, ContentAudience.BOTH],
  [Role.TEACHER]: [ContentAudience.TEACHER, ContentAudience.BOTH],
} as const;

function contentHref(role: LearnerRole, subjectId: string) {
  const roleSegment = role === Role.STUDENT ? "student" : "teacher";
  return `/dashboard/${roleSegment}/content#subject-${encodeURIComponent(subjectId)}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export const getLearnerDashboardData = cache(async (
  role: LearnerRole,
): Promise<LearnerDashboardData> => {
  const user = await requireRole(role);
  const audiences = [...audiencesByRole[role]];
  const levels = await prisma.level.findMany({
    where: { isActive: true },
    orderBy: [{ levelNumber: "asc" }, { id: "asc" }],
    select: {
      id: true,
      levelNumber: true,
      description: true,
      requiresSubscription: true,
    },
  });
  const selectedLevel =
    levels.find((level) => level.id === user.selectedLevelId) ?? null;

  if (!selectedLevel) {
    return {
      user: { id: user.id, name: user.name, email: user.email, firstName: firstName(user.name) },
      levels,
      selectedLevel: null,
      access: { status: "NO_LEVEL", currentPeriodEnd: null },
      subjects: [],
      continueTarget: null,
      recentResources: [],
      availableResources: [],
      searchItems: [],
    };
  }

  const accessDecision = await getPremiumAccessDecision(selectedLevel.id);
  const accessStatus = accessDecision.decision.allowed
    ? accessDecision.subscription
      ? "ACTIVE"
      : "INCLUDED"
    : "LOCKED";

  if (!accessDecision.decision.allowed) {
    return {
      user: { id: user.id, name: user.name, email: user.email, firstName: firstName(user.name) },
      levels,
      selectedLevel,
      access: { status: accessStatus, currentPeriodEnd: null },
      subjects: [],
      continueTarget: null,
      recentResources: [],
      availableResources: [],
      searchItems: [],
    };
  }

  const subjects = await prisma.subject.findMany({
    where: {
      levelId: selectedLevel.id,
      isActive: true,
      modules: {
        some: {
          isActive: true,
          publicationStatus: PublicationStatus.PUBLISHED,
          audience: { in: audiences },
        },
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      modules: {
        where: {
          isActive: true,
          publicationStatus: PublicationStatus.PUBLISHED,
          audience: { in: audiences },
        },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          resources: {
            where: {
              isActive: true,
              publicationStatus: PublicationStatus.PUBLISHED,
            },
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              lesson: { select: { estimatedMinutes: true } },
              youtubeVideo: { select: { duration: true } },
            },
          },
        },
      },
    },
  });

  const resourceContext = new Map<
    string,
    {
      resource: (typeof subjects)[number]["modules"][number]["resources"][number];
      subjectId: string;
      subjectName: string;
      moduleId: string;
      moduleTitle: string;
      moduleResourceIds: string[];
    }
  >();
  const searchItems: LearnerSearchItem[] = [];

  for (const subject of subjects) {
    const href = contentHref(role, subject.id);
    searchItems.push({
      id: `subject-${subject.id}`,
      kind: "subject",
      label: subject.name,
      context: `Materia · Nivel ${selectedLevel.levelNumber}`,
      href,
    });

    for (const moduleRecord of subject.modules) {
      searchItems.push({
        id: `module-${moduleRecord.id}`,
        kind: "module",
        label: moduleRecord.title,
        context: subject.name,
        href,
      });
      const moduleResourceIds = moduleRecord.resources.map((resource) => resource.id);
      for (const resource of moduleRecord.resources) {
        resourceContext.set(resource.id, {
          resource,
          subjectId: subject.id,
          subjectName: subject.name,
          moduleId: moduleRecord.id,
          moduleTitle: moduleRecord.title,
          moduleResourceIds,
        });
        searchItems.push({
          id: `resource-${resource.id}`,
          kind: "resource",
          label: resource.title,
          context: `${subject.name} · ${moduleRecord.title}`,
          href,
        });
      }
    }
  }

  const resourceIds = [...resourceContext.keys()];
  const progressRows = resourceIds.length
    ? await prisma.resourceProgress.findMany({
        where: { userId: user.id, resourceId: { in: resourceIds } },
        orderBy: [{ startedAt: "desc" }, { id: "asc" }],
        select: {
          resourceId: true,
          completed: true,
          startedAt: true,
        },
      })
    : [];
  const progressByResource = new Map(
    progressRows.map((progress) => [progress.resourceId, progress]),
  );

  function summarizeResource(
    resourceId: string,
    options?: { allowMissingProgress?: boolean },
  ): LearnerResourceSummary | null {
    const context = resourceContext.get(resourceId);
    if (!context) return null;
    const progress = progressByResource.get(resourceId);
    if (!progress && !options?.allowMissingProgress) return null;

    return {
      id: context.resource.id,
      title: context.resource.title,
      description: context.resource.description,
      type: context.resource.type,
      subjectId: context.subjectId,
      subjectName: context.subjectName,
      moduleId: context.moduleId,
      moduleTitle: context.moduleTitle,
      estimatedMinutes: context.resource.lesson?.estimatedMinutes ?? null,
      durationSeconds: context.resource.youtubeVideo?.duration ?? null,
      startedAt: progress?.startedAt.toISOString() ?? null,
      completed: progress?.completed ?? false,
      href: contentHref(role, context.subjectId),
    };
  }

  const recentResources = progressRows
    .map((progress) => summarizeResource(progress.resourceId))
    .filter((resource): resource is LearnerResourceSummary => Boolean(resource))
    .slice(0, 6);

  const availableResources = resourceIds
    .map((resourceId) =>
      summarizeResource(resourceId, { allowMissingProgress: true }),
    )
    .filter((resource): resource is LearnerResourceSummary => Boolean(resource))
    .slice(0, 6);

  const continueProgress =
    progressRows.find((progress) => !progress.completed) ?? progressRows[0];
  let continueTarget: LearnerContinueTarget | null = null;
  if (continueProgress) {
    const summary = summarizeResource(continueProgress.resourceId);
    const context = resourceContext.get(continueProgress.resourceId);
    if (summary && context) {
      const completedCount = context.moduleResourceIds.filter(
        (resourceId) => progressByResource.get(resourceId)?.completed,
      ).length;
      continueTarget = {
        ...summary,
        progressPercent:
          context.moduleResourceIds.length > 0
            ? Math.round((completedCount / context.moduleResourceIds.length) * 100)
            : null,
        isProgressRecord: true,
      };
    }
  }

  if (!continueTarget) {
    const firstResourceId = resourceIds[0];
    const summary = firstResourceId
      ? summarizeResource(firstResourceId, { allowMissingProgress: true })
      : null;
    if (summary) {
      continueTarget = {
        ...summary,
        progressPercent: null,
        isProgressRecord: false,
      };
    }
  }

  return {
    user: { id: user.id, name: user.name, email: user.email, firstName: firstName(user.name) },
    levels,
    selectedLevel,
    access: {
      status: accessStatus,
      currentPeriodEnd: accessDecision.subscription?.currentPeriodEnd.toISOString() ?? null,
    },
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      moduleCount: subject.modules.length,
      resourceCount: subject.modules.reduce(
        (total, moduleRecord) => total + moduleRecord.resources.length,
        0,
      ),
      href: contentHref(role, subject.id),
    })),
    continueTarget,
    recentResources,
    availableResources,
    searchItems,
  };
});

export function getStudentDashboardData() {
  return getLearnerDashboardData(Role.STUDENT);
}

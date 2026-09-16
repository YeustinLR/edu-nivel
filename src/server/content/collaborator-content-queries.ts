import "server-only";

import {
  getModuleAudiencesForSelection,
  type ModuleAudienceSelection,
} from "@/modules/content/domain/content-audience";
import { prisma } from "@/server/db/prisma";

export const COLLABORATOR_TEAM_PAGE_SIZE = 10;

export function normalizeCollaboratorTeamPage(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export async function getCollaboratorContentWorkspace(
  userId: string,
  options: {
    teamAudience?: ModuleAudienceSelection;
    teamPage?: number;
  } = {},
) {
  const teamAudience = options.teamAudience ?? "STUDENT";
  const teamPage = Math.max(1, Math.trunc(options.teamPage ?? 1));
  const teamModuleWhere = {
    createdById: { not: userId },
    audience: { in: getModuleAudiencesForSelection(teamAudience) },
    isActive: true,
    subject: { isActive: true, level: { isActive: true } },
  } as const;
  const [subjects, modules, resourceCount, teamModuleTotal, teamModules, resourceModuleRecords] = await Promise.all([
    prisma.subject.findMany({
      where: { isActive: true, level: { isActive: true } },
      orderBy: [{ level: { levelNumber: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        name: true,
        level: { select: { levelNumber: true } },
      },
    }),
    prisma.module.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        audience: true,
        publicationStatus: true,
        reviewNote: true,
        isActive: true,
        updatedAt: true,
        subject: {
          select: {
            name: true,
            isActive: true,
            level: { select: { levelNumber: true, isActive: true } },
          },
        },
        resources: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            type: true,
            publicationStatus: true,
            reviewNote: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.resource.count({ where: { createdById: userId } }),
    prisma.module.count({
      where: teamModuleWhere,
    }),
    prisma.module.findMany({
      where: teamModuleWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (teamPage - 1) * COLLABORATOR_TEAM_PAGE_SIZE,
      take: COLLABORATOR_TEAM_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        audience: true,
        publicationStatus: true,
        createdBy: { select: { name: true } },
        subject: {
          select: { name: true, level: { select: { levelNumber: true } } },
        },
        resources: {
          where: { publicationStatus: "PUBLISHED", isActive: true },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          take: 20,
          select: { id: true, title: true, type: true },
        },
        _count: {
          select: {
            resources: {
              where: { publicationStatus: "PUBLISHED", isActive: true },
            },
          },
        },
      },
    }),
    prisma.module.findMany({
      where: {
        isActive: true,
        publicationStatus: { in: ["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED", "PUBLISHED"] },
        subject: { isActive: true, level: { isActive: true } },
      },
      orderBy: [{ subject: { level: { levelNumber: "asc" } } }, { subject: { order: "asc" } }, { order: "asc" }],
      select: { id: true, title: true, subject: { select: { name: true, level: { select: { levelNumber: true } } } } },
    }),
  ]);

  const moduleOptions = resourceModuleRecords.map((module) => ({
      id: module.id,
      title: module.title,
      subjectName: `Nivel ${module.subject.level.levelNumber} / ${module.subject.name}`,
  }));

  return {
    subjects,
    modules,
    resourceCount,
    teamModules,
    teamPagination: {
      audience: teamAudience,
      page: teamPage,
      pageSize: COLLABORATOR_TEAM_PAGE_SIZE,
      totalItems: teamModuleTotal,
      totalPages: Math.max(
        1,
        Math.ceil(teamModuleTotal / COLLABORATOR_TEAM_PAGE_SIZE),
      ),
    },
    moduleOptions,
  };
}

export type CollaboratorContentWorkspace = Awaited<
  ReturnType<typeof getCollaboratorContentWorkspace>
>;
export type CollaboratorModule = CollaboratorContentWorkspace["modules"][number];
export type CollaboratorTeamModule =
  CollaboratorContentWorkspace["teamModules"][number];

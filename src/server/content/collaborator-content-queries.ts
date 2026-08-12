import "server-only";

import { prisma } from "@/server/db/prisma";

export async function getCollaboratorContentWorkspace(userId: string) {
  const [subjects, modules, teamModules] = await Promise.all([
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
    prisma.module.findMany({
      where: {
        createdById: { not: userId },
        isActive: true,
        subject: { isActive: true, level: { isActive: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 20,
      select: {
        id: true,
        title: true,
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
      },
    }),
  ]);

  const moduleOptions = modules
    .filter(
      (module) =>
        module.isActive &&
        module.subject.isActive &&
        module.subject.level.isActive &&
        ["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED", "PUBLISHED"].includes(
          module.publicationStatus,
        ),
    )
    .map((module) => ({
      id: module.id,
      title: module.title,
      subjectName: `Nivel ${module.subject.level.levelNumber} / ${module.subject.name}`,
    }));

  return { subjects, modules, teamModules, moduleOptions };
}

export type CollaboratorContentWorkspace = Awaited<
  ReturnType<typeof getCollaboratorContentWorkspace>
>;
export type CollaboratorModule = CollaboratorContentWorkspace["modules"][number];
export type CollaboratorTeamModule =
  CollaboratorContentWorkspace["teamModules"][number];

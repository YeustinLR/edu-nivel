import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  getModuleReviewWhere,
  getResourceReviewWhere,
} from "@/server/content/admin-review-query-filters";
import type {
  AdminReviewDetail,
  AdminReviewFilters,
} from "@/server/content/admin-review-query-types";
import { prisma } from "@/server/db/prisma";
import { ContentRevisionStatus } from "@/generated/prisma/enums";
import { asModuleRevisionPayload, asResourceRevisionPayload } from "@/server/content/content-revisions";

async function getModuleAdjacentIds(
  where: Prisma.ModuleWhereInput,
  current: { id: string; updatedAt: Date },
) {
  const [previous, next] = await Promise.all([
    prisma.module.findFirst({
      where: {
        AND: [
          where,
          {
            OR: [
              { updatedAt: { lt: current.updatedAt } },
              {
                updatedAt: current.updatedAt,
                id: { lt: current.id },
              },
            ],
          },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true },
    }),
    prisma.module.findFirst({
      where: {
        AND: [
          where,
          {
            OR: [
              { updatedAt: { gt: current.updatedAt } },
              {
                updatedAt: current.updatedAt,
                id: { gt: current.id },
              },
            ],
          },
        ],
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      select: { id: true },
    }),
  ]);

  return { previousId: previous?.id ?? null, nextId: next?.id ?? null };
}

async function getResourceAdjacentIds(
  where: Prisma.ResourceWhereInput,
  current: { id: string; updatedAt: Date },
) {
  const [previous, next] = await Promise.all([
    prisma.resource.findFirst({
      where: {
        AND: [
          where,
          {
            OR: [
              { updatedAt: { lt: current.updatedAt } },
              {
                updatedAt: current.updatedAt,
                id: { lt: current.id },
              },
            ],
          },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true },
    }),
    prisma.resource.findFirst({
      where: {
        AND: [
          where,
          {
            OR: [
              { updatedAt: { gt: current.updatedAt } },
              {
                updatedAt: current.updatedAt,
                id: { gt: current.id },
              },
            ],
          },
        ],
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      select: { id: true },
    }),
  ]);

  return { previousId: previous?.id ?? null, nextId: next?.id ?? null };
}

export async function getAdminReviewDetail(
  filters: AdminReviewFilters,
  reviewId: string,
): Promise<AdminReviewDetail | null> {
  if (filters.kind === "modules") {
    const revision = await prisma.contentRevision.findUnique({
      where: { moduleId: reviewId },
      include: { updatedBy: { select: { name: true } }, module: { select: { id: true, subjectId: true, audience: true, subject: { select: { name: true, level: { select: { levelNumber: true } } } }, _count: { select: { resources: true } } } } },
    });
    if (revision?.status === ContentRevisionStatus.IN_REVIEW && revision.module) {
      const payload = asModuleRevisionPayload(revision.payload);
      return { id: revision.module.id, kind: "modules", title: payload.title, description: payload.description, instructions: null, parentId: revision.module.subjectId, context: `Nivel ${revision.module.subject.level.levelNumber} / ${revision.module.subject.name}`, audience: payload.audience, resourceType: null, authorName: revision.updatedBy.name, submittedAt: revision.submittedAt, updatedAt: revision.updatedAt, resourceCount: revision.module._count.resources, previousId: null, nextId: null };
    }
    const where = getModuleReviewWhere(filters);
    const item = await prisma.module.findFirst({
      where: { AND: [where, { id: reviewId }] },
      select: {
        id: true,
        title: true,
        description: true,
        subjectId: true,
        audience: true,
        submittedForReviewAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        subject: {
          select: {
            name: true,
            level: { select: { levelNumber: true } },
          },
        },
        _count: { select: { resources: true } },
      },
    });

    if (!item) return null;
    const adjacent = await getModuleAdjacentIds(where, item);

    return {
      id: item.id,
      kind: "modules",
      title: item.title,
      description: item.description,
      instructions: null,
      parentId: item.subjectId,
      context: `Nivel ${item.subject.level.levelNumber} / ${item.subject.name}`,
      audience: item.audience,
      resourceType: null,
      authorName: item.createdBy.name,
      submittedAt: item.submittedForReviewAt,
      updatedAt: item.updatedAt,
      resourceCount: item._count.resources,
      ...adjacent,
    };
  }

  const where = getResourceReviewWhere(filters);
  const revision = await prisma.contentRevision.findUnique({
    where: { resourceId: reviewId },
    include: { updatedBy: { select: { name: true } }, resource: { select: { id: true, type: true, moduleId: true, module: { select: { title: true, audience: true, subject: { select: { name: true, level: { select: { levelNumber: true } } } } } } } } },
  });
  if (revision?.status === ContentRevisionStatus.IN_REVIEW && revision.resource) {
    const payload = asResourceRevisionPayload(revision.payload);
    return { id: revision.resource.id, kind: "resources", title: payload.title, description: null, instructions: payload.instructions, parentId: revision.resource.moduleId, context: `Nivel ${revision.resource.module.subject.level.levelNumber} / ${revision.resource.module.subject.name} / ${revision.resource.module.title}`, audience: revision.resource.module.audience, resourceType: revision.resource.type, authorName: revision.updatedBy.name, submittedAt: revision.submittedAt, updatedAt: revision.updatedAt, resourceCount: null, previousId: null, nextId: null };
  }
  const item = await prisma.resource.findFirst({
    where: { AND: [where, { id: reviewId }] },
    select: {
      id: true,
      title: true,
      instructions: true,
      type: true,
      moduleId: true,
      submittedForReviewAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      module: {
        select: {
          title: true,
          audience: true,
          subject: {
            select: {
              name: true,
              level: { select: { levelNumber: true } },
            },
          },
        },
      },
    },
  });

  if (!item) return null;
  const adjacent = await getResourceAdjacentIds(where, item);

  return {
    id: item.id,
    kind: "resources",
    title: item.title,
    description: null,
    instructions: item.instructions,
    parentId: item.moduleId,
    context: `Nivel ${item.module.subject.level.levelNumber} / ${item.module.subject.name} / ${item.module.title}`,
    audience: item.module.audience,
    resourceType: item.type,
    authorName: item.createdBy.name,
    submittedAt: item.submittedForReviewAt,
    updatedAt: item.updatedAt,
    resourceCount: null,
    ...adjacent,
  };
}

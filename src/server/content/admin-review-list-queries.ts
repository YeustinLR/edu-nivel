import "server-only";

import { PublicationStatus } from "@/generated/prisma/enums";
import {
  getModuleReviewWhere,
  getResourceReviewWhere,
} from "@/server/content/admin-review-query-filters";
import type {
  AdminReviewFilters,
  AdminReviewQueue,
} from "@/server/content/admin-review-query-types";
import { prisma } from "@/server/db/prisma";

export async function getAdminReviewQueue(
  filters: AdminReviewFilters,
): Promise<AdminReviewQueue> {
  if (filters.kind === "modules") {
    const where = getModuleReviewWhere(filters);
    const [totalItems, items, authors] = await Promise.all([
      prisma.module.count({ where }),
      prisma.module.findMany({
        where,
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: {
          id: true,
          title: true,
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
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          createdModules: {
            some: { publicationStatus: PublicationStatus.IN_REVIEW },
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        kind: "modules",
        title: item.title,
        context: `Nivel ${item.subject.level.levelNumber} / ${item.subject.name}`,
        audience: item.audience,
        resourceType: null,
        authorName: item.createdBy.name,
        submittedAt: item.submittedForReviewAt,
        updatedAt: item.updatedAt,
        resourceCount: item._count.resources,
      })),
      authors,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  const where = getResourceReviewWhere(filters);
  const [totalItems, items, authors] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        title: true,
        type: true,
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
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        createdResources: {
          some: { publicationStatus: PublicationStatus.IN_REVIEW },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      kind: "resources",
      title: item.title,
      context: `Nivel ${item.module.subject.level.levelNumber} / ${item.module.subject.name} / ${item.module.title}`,
      audience: item.module.audience,
      resourceType: item.type,
      authorName: item.createdBy.name,
      submittedAt: item.submittedForReviewAt,
      updatedAt: item.updatedAt,
      resourceCount: null,
    })),
    authors,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

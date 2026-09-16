import "server-only";

import { ContentRevisionKind, ContentRevisionStatus, PublicationStatus } from "@/generated/prisma/enums";
import { asModuleRevisionPayload, asResourceRevisionPayload } from "@/server/content/content-revisions";
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
    const revisionWhere = {
      kind: ContentRevisionKind.MODULE,
      status: ContentRevisionStatus.IN_REVIEW,
      ...(filters.authorId ? { updatedById: filters.authorId } : {}),
      module: {
        ...(filters.audience ? { audience: filters.audience } : {}),
        ...(filters.query ? { OR: [{ title: { contains: filters.query, mode: "insensitive" as const } }, { description: { contains: filters.query, mode: "insensitive" as const } }] } : {}),
      },
    };
    const [baseTotal, items, authors, revisionItems, revisionTotal, revisionAuthors] = await Promise.all([
      prisma.module.count({ where }),
      prisma.module.findMany({
        where,
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        take: filters.page * filters.pageSize,
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
      prisma.contentRevision.findMany({
        where: revisionWhere,
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        take: filters.page * filters.pageSize,
        include: { updatedBy: { select: { id: true, name: true } }, module: { select: { id: true, title: true, description: true, audience: true, subject: { select: { name: true, level: { select: { levelNumber: true } } } }, _count: { select: { resources: true } } } } },
      }),
      prisma.contentRevision.count({ where: revisionWhere }),
      prisma.user.findMany({ where: { deletedAt: null, contentRevisionsUpdated: { some: revisionWhere } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } }),
    ]);
    const totalItems = baseTotal + revisionTotal;
    const merged = [
      ...items.map((item) => ({ id: item.id, kind: "modules" as const, title: item.title, context: `Nivel ${item.subject.level.levelNumber} / ${item.subject.name}`, audience: item.audience, resourceType: null, authorName: item.createdBy.name, submittedAt: item.submittedForReviewAt, updatedAt: item.updatedAt, resourceCount: item._count.resources })),
      ...revisionItems.flatMap((revision) => revision.module ? (() => { const payload = asModuleRevisionPayload(revision.payload); return [{ id: revision.module!.id, kind: "modules" as const, title: payload.title, context: `Nivel ${revision.module!.subject.level.levelNumber} / ${revision.module!.subject.name}`, audience: payload.audience, resourceType: null, authorName: revision.updatedBy.name, submittedAt: revision.submittedAt, updatedAt: revision.updatedAt, resourceCount: revision.module!._count.resources }]; })() : []),
    ].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || a.id.localeCompare(b.id));
    const pageItems = merged.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize);
    const authorMap = new Map([...authors, ...revisionAuthors].map((author) => [author.id, author]));
    return {
      items: pageItems,
      authors: [...authorMap.values()],
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  const where = getResourceReviewWhere(filters);
  const revisionWhere = {
    kind: ContentRevisionKind.RESOURCE,
    status: ContentRevisionStatus.IN_REVIEW,
    ...(filters.authorId ? { updatedById: filters.authorId } : {}),
    resource: {
      ...(filters.resourceType ? { type: filters.resourceType } : {}),
      module: {
        ...(filters.audience ? { audience: filters.audience } : {}),
      },
      ...(filters.query ? { OR: [{ title: { contains: filters.query, mode: "insensitive" as const } }, { instructions: { contains: filters.query, mode: "insensitive" as const } }, { module: { title: { contains: filters.query, mode: "insensitive" as const } } }] } : {}),
    },
  };
  const [baseTotal, items, authors, revisionItems, revisionTotal, revisionAuthors] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: filters.page * filters.pageSize,
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
    prisma.contentRevision.findMany({ where: revisionWhere, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: filters.page * filters.pageSize, include: { updatedBy: { select: { id: true, name: true } }, resource: { select: { id: true, title: true, instructions: true, type: true, module: { select: { title: true, audience: true, subject: { select: { name: true, level: { select: { levelNumber: true } } } } } } } } } }),
    prisma.contentRevision.count({ where: revisionWhere }),
    prisma.user.findMany({ where: { deletedAt: null, contentRevisionsUpdated: { some: revisionWhere } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } }),
  ]);
  const totalItems = baseTotal + revisionTotal;
  const merged = [
    ...items.map((item) => ({ id: item.id, kind: "resources" as const, title: item.title, context: `Nivel ${item.module.subject.level.levelNumber} / ${item.module.subject.name} / ${item.module.title}`, audience: item.module.audience, resourceType: item.type, authorName: item.createdBy.name, submittedAt: item.submittedForReviewAt, updatedAt: item.updatedAt, resourceCount: null })),
    ...revisionItems.flatMap((revision) => revision.resource ? (() => { const payload = asResourceRevisionPayload(revision.payload); return [{ id: revision.resource!.id, kind: "resources" as const, title: payload.title, context: `Nivel ${revision.resource!.module.subject.level.levelNumber} / ${revision.resource!.module.subject.name} / ${revision.resource!.module.title}`, audience: revision.resource!.module.audience, resourceType: revision.resource!.type, authorName: revision.updatedBy.name, submittedAt: revision.submittedAt, updatedAt: revision.updatedAt, resourceCount: null }]; })() : []),
  ].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime() || a.id.localeCompare(b.id));
  const authorMap = new Map([...authors, ...revisionAuthors].map((author) => [author.id, author]));
  return {
    items: merged.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize),
    authors: [...authorMap.values()],
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / filters.pageSize)),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

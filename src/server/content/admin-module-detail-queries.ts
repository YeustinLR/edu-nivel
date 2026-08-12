import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  type ContentAudience,
  PublicationStatus,
  ResourceType,
} from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";

export type AdminModuleDetailResource = {
  id: string;
  title: string;
  type: ResourceType;
  publicationStatus: PublicationStatus;
  isActive: boolean;
  authorName: string;
  updatedAt: Date;
};

export type AdminModuleDetail = {
  id: string;
  title: string;
  description: string | null;
  audience: ContentAudience;
  publicationStatus: PublicationStatus;
  order: number;
  isActive: boolean;
  authorName: string;
  subjectName: string;
  levelNumber: number;
  requiresSubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
  submittedForReviewAt: Date | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  publishedByName: string | null;
  publishedAt: Date | null;
  resourceCount: number;
  reviewChecklist: {
    hasDescription: boolean;
    imageCount: number;
    imagesMissingAltText: number;
    nonPublishedResourceCount: number;
  };
  resources: {
    items: AdminModuleDetailResource[];
    totalItems: number;
    totalPages: number;
    page: number;
    pageSize: number;
  } | null;
};

export type AdminModuleDetailFilters = {
  moduleId: string;
  subjectId: string;
  includeResources: boolean;
  includeReviewChecklist: boolean;
  resourcePage: number;
  resourcePageSize: number;
};

export async function getAdminModuleDetail({
  moduleId,
  subjectId,
  includeResources,
  includeReviewChecklist,
  resourcePage,
  resourcePageSize,
}: AdminModuleDetailFilters): Promise<AdminModuleDetail | null> {
  const resourceWhere = {
    moduleId,
    module: { subjectId },
  } satisfies Prisma.ResourceWhereInput;
  const moduleQuery = prisma.module.findFirst({
    where: { id: moduleId, subjectId },
    select: {
      id: true,
      title: true,
      description: true,
      audience: true,
      publicationStatus: true,
      order: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      submittedForReviewAt: true,
      reviewedAt: true,
      reviewNote: true,
      publishedAt: true,
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      publishedBy: { select: { name: true } },
      subject: {
        select: {
          name: true,
          level: {
            select: {
              levelNumber: true,
              requiresSubscription: true,
            },
          },
        },
      },
      _count: { select: { resources: true } },
    },
  });

  const [module, resourceGroups, imagesMissingAltText, resources] =
    await Promise.all([
      moduleQuery,
      includeReviewChecklist
        ? prisma.resource.groupBy({
            by: ["type", "publicationStatus"],
            where: resourceWhere,
            _count: { _all: true },
          })
        : Promise.resolve([]),
      includeReviewChecklist
        ? prisma.imageResource.count({
            where: {
              resource: resourceWhere,
              OR: [{ altText: null }, { altText: "" }],
            },
          })
        : Promise.resolve(0),
      includeResources
        ? prisma.resource.findMany({
            where: resourceWhere,
            orderBy: [
              { order: "asc" },
              { createdAt: "asc" },
              { id: "asc" },
            ],
            skip: (resourcePage - 1) * resourcePageSize,
            take: resourcePageSize,
            select: {
              id: true,
              title: true,
              type: true,
              publicationStatus: true,
              isActive: true,
              updatedAt: true,
              createdBy: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  if (!module) {
    return null;
  }

  const imageCount = resourceGroups.reduce(
    (total, group) =>
      group.type === ResourceType.IMAGE ? total + group._count._all : total,
    0,
  );
  const nonPublishedResourceCount = resourceGroups.reduce(
    (total, group) =>
      group.publicationStatus !== PublicationStatus.PUBLISHED
        ? total + group._count._all
        : total,
    0,
  );

  return {
    id: module.id,
    title: module.title,
    description: module.description,
    audience: module.audience,
    publicationStatus: module.publicationStatus,
    order: module.order,
    isActive: module.isActive,
    authorName: module.createdBy.name,
    subjectName: module.subject.name,
    levelNumber: module.subject.level.levelNumber,
    requiresSubscription: module.subject.level.requiresSubscription,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
    submittedForReviewAt: module.submittedForReviewAt,
    reviewedByName: module.reviewedBy?.name ?? null,
    reviewedAt: module.reviewedAt,
    reviewNote: module.reviewNote,
    publishedByName: module.publishedBy?.name ?? null,
    publishedAt: module.publishedAt,
    resourceCount: module._count.resources,
    reviewChecklist: {
      hasDescription: Boolean(module.description?.trim()),
      imageCount,
      imagesMissingAltText,
      nonPublishedResourceCount,
    },
    resources: includeResources
      ? {
          items: resources.map((resource) => ({
            id: resource.id,
            title: resource.title,
            type: resource.type,
            publicationStatus: resource.publicationStatus,
            isActive: resource.isActive,
            authorName: resource.createdBy.name,
            updatedAt: resource.updatedAt,
          })),
          totalItems: module._count.resources,
          totalPages: Math.max(
            1,
            Math.ceil(module._count.resources / resourcePageSize),
          ),
          page: resourcePage,
          pageSize: resourcePageSize,
        }
      : null,
  };
}

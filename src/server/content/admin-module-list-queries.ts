import "server-only";

import {
  type ContentAudience,
  type PublicationStatus,
  type ResourceType,
} from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";

export type AdminModuleRow = {
  id: string;
  title: string;
  description: string | null;
  audience: ContentAudience;
  resourceCount: number;
  authorName: string;
  isActive: boolean;
  updatedAt: Date;
  publicationStatus: PublicationStatus;
  resources: Array<{
    id: string;
    title: string;
    description: string | null;
    type: ResourceType;
    publicationStatus: PublicationStatus;
    isActive: boolean;
    authorName: string;
  }>;
};

export type AdminModuleOption = {
  id: string;
  title: string;
};

export type AdminModulePage = {
  items: AdminModuleRow[];
  moduleOptions: AdminModuleOption[];
  selectedModuleId?: string;
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type AdminModuleFilters = {
  subjectId: string;
  moduleId?: string;
  page: number;
  pageSize: number;
};

export async function getAdminModulesPage({
  subjectId,
  moduleId,
  page,
  pageSize,
}: AdminModuleFilters): Promise<AdminModulePage> {
  const moduleOptions = await prisma.module.findMany({
    where: { subjectId },
    orderBy: [{ order: "asc" }, { title: "asc" }, { id: "asc" }],
    select: { id: true, title: true },
  });
  const selectedModuleId = moduleOptions.some((option) => option.id === moduleId)
    ? moduleId
    : undefined;
  const where = {
    subjectId,
    ...(selectedModuleId ? { id: selectedModuleId } : {}),
  };

  const [totalItems, modules] = await Promise.all([
    prisma.module.count({ where }),
    prisma.module.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        audience: true,
        publicationStatus: true,
        isActive: true,
        updatedAt: true,
        createdBy: {
          select: { name: true },
        },
        _count: {
          select: { resources: true },
        },
        resources: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            publicationStatus: true,
            isActive: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      audience: module.audience,
      resourceCount: module._count.resources,
      authorName: module.createdBy.name,
      isActive: module.isActive,
      updatedAt: module.updatedAt,
      publicationStatus: module.publicationStatus,
      resources: module.resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type,
        publicationStatus: resource.publicationStatus,
        isActive: resource.isActive,
        authorName: resource.createdBy.name,
      })),
    })),
    moduleOptions,
    selectedModuleId,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
  };
}

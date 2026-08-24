import "server-only";

import {
  type ContentAudience,
  type PublicationStatus,
  type ResourceType,
} from "@/generated/prisma/enums";
import {
  getModuleAudiencesForSelection,
  type ModuleAudienceSelection,
} from "@/modules/content/domain/content-audience";
import {
  canArchiveEditorialContent,
  canCreateResource,
  canEditEditorialContent,
  canEditModuleContent,
  canReactivateEditorialContent,
  type ContentPermissionActor,
} from "@/modules/content/domain/content-permissions";
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
    instructions: string | null;
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
  audience: ModuleAudienceSelection;
  page: number;
  pageSize: number;
};

export type AdminSubjectWorkspaceResource = {
  id: string;
  title: string;
  instructions: string | null;
  type: ResourceType;
  publicationStatus: PublicationStatus;
  isActive: boolean;
  authorName: string;
  updatedAt: string;
  order: number;
  information: string | null;
  canEdit: boolean;
  canArchive: boolean;
  canReactivate: boolean;
};

export type AdminSubjectWorkspaceModule = {
  id: string;
  title: string;
  description: string | null;
  audience: ContentAudience;
  publicationStatus: PublicationStatus;
  isActive: boolean;
  authorName: string;
  updatedAt: string;
  order: number;
  canEdit: boolean;
  canAddResource: boolean;
  canArchive: boolean;
  canReactivate: boolean;
  resources: AdminSubjectWorkspaceResource[];
};

function formatBytes(value: bigint | null) {
  if (value === null) return null;
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return null;
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/**
 * Workspace query: loads only list metadata in one relation query. Large
 * written bodies are intentionally fetched on demand by the quick editor.
 */
export async function getAdminSubjectContentWorkspace({
  subjectId,
  actor,
  hierarchyIsActive,
}: {
  subjectId: string;
  actor: ContentPermissionActor;
  hierarchyIsActive: boolean;
}): Promise<AdminSubjectWorkspaceModule[]> {
  const modules = await prisma.module.findMany({
    where: { subjectId },
    orderBy: [{ order: "asc" }, { title: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      audience: true,
      publicationStatus: true,
      isActive: true,
      order: true,
      updatedAt: true,
      createdById: true,
      createdBy: { select: { name: true } },
      resources: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          instructions: true,
          type: true,
          publicationStatus: true,
          isActive: true,
          order: true,
          updatedAt: true,
          createdById: true,
          createdBy: { select: { name: true } },
          estimatedMinutes: true,
          youtubeVideo: { select: { duration: true } },
          pdfResource: { select: { sizeBytes: true, pageCount: true } },
          fileResource: { select: { sizeBytes: true } },
          imageResource: {
            select: { sizeBytes: true, width: true, height: true },
          },
          audioResource: { select: { sizeBytes: true, duration: true } },
          quiz: { select: { maxAttempts: true } },
          gameResource: { select: { gameType: true } },
        },
      },
    },
  });

  return modules.map((moduleRecord) => {
    const moduleTarget = {
      createdById: moduleRecord.createdById,
      publicationStatus: moduleRecord.publicationStatus,
    };

    return {
      id: moduleRecord.id,
      title: moduleRecord.title,
      description: moduleRecord.description,
      audience: moduleRecord.audience,
      publicationStatus: moduleRecord.publicationStatus,
      isActive: moduleRecord.isActive,
      authorName: moduleRecord.createdBy.name,
      updatedAt: moduleRecord.updatedAt.toISOString(),
      order: moduleRecord.order,
      canEdit: canEditModuleContent(actor, moduleTarget),
      canAddResource:
        hierarchyIsActive &&
        moduleRecord.isActive &&
        canCreateResource(actor, moduleTarget),
      canArchive: canArchiveEditorialContent(actor, moduleTarget),
      canReactivate:
        hierarchyIsActive && canReactivateEditorialContent(actor, moduleTarget),
      resources: moduleRecord.resources.map((resource) => {
        const resourceTarget = {
          createdById: resource.createdById,
          publicationStatus: resource.publicationStatus,
        };
        const information = resource.estimatedMinutes
          ? `${resource.estimatedMinutes} min de lectura`
          : formatDuration(resource.youtubeVideo?.duration ?? null) ??
            formatBytes(
              resource.pdfResource?.sizeBytes ??
                resource.fileResource?.sizeBytes ??
                resource.imageResource?.sizeBytes ??
                resource.audioResource?.sizeBytes ??
                null,
            ) ??
            (resource.imageResource?.width && resource.imageResource.height
              ? `${resource.imageResource.width} × ${resource.imageResource.height} px`
              : null) ??
            (resource.audioResource?.duration
              ? formatDuration(resource.audioResource.duration)
              : null) ??
            (resource.gameResource?.gameType ?? null);

        return {
          id: resource.id,
          title: resource.title,
          instructions: resource.instructions,
          type: resource.type,
          publicationStatus: resource.publicationStatus,
          isActive: resource.isActive,
          authorName: resource.createdBy.name,
          updatedAt: resource.updatedAt.toISOString(),
          order: resource.order,
          information,
          canEdit: canEditEditorialContent(actor, resourceTarget),
          canArchive: canArchiveEditorialContent(actor, resourceTarget),
          canReactivate:
            hierarchyIsActive &&
            moduleRecord.isActive &&
            canReactivateEditorialContent(actor, resourceTarget),
        };
      }),
    };
  });
}

export async function getAdminModulesPage({
  subjectId,
  moduleId,
  audience,
  page,
  pageSize,
}: AdminModuleFilters): Promise<AdminModulePage> {
  const audienceFilter = {
    in: getModuleAudiencesForSelection(audience),
  };
  const moduleOptions = await prisma.module.findMany({
    where: { subjectId, audience: audienceFilter },
    orderBy: [{ order: "asc" }, { title: "asc" }, { id: "asc" }],
    select: { id: true, title: true },
  });
  const selectedModuleId = moduleOptions.some((option) => option.id === moduleId)
    ? moduleId
    : undefined;
  const where = {
    subjectId,
    audience: audienceFilter,
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
            instructions: true,
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
        instructions: resource.instructions,
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

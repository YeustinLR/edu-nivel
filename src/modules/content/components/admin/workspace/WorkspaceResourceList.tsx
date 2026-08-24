"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  Eye,
  GripVertical,
  Pencil,
  RotateCcw,
  Send,
} from "lucide-react";
import { useState } from "react";

import { PublicationStatus, ResourceType } from "@/generated/prisma/enums";
import {
  PublicationStatusBadge,
  ResourceTypeBadge,
  ResourceTypeIcon,
} from "@/modules/content/components/admin/ContentBadges";
import { formatRelativeWorkspaceDate } from "@/modules/content/components/admin/workspace/content-workspace-presentation";
import { WorkspaceActionMenu } from "@/modules/content/components/admin/workspace/WorkspaceActionMenu";
import type { AdminSubjectWorkspaceResource } from "@/server/content/admin-module-list-queries";

const resourceIconClasses = {
  [ResourceType.NOTE]: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  [ResourceType.QUIZ]: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  [ResourceType.YOUTUBE]: "bg-red-500/10 text-red-700 dark:text-red-300",
  [ResourceType.PDF]: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  [ResourceType.FILE]: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  [ResourceType.LINK]: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  [ResourceType.GAME]: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  [ResourceType.IMAGE]: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  [ResourceType.AUDIO]: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
} satisfies Record<ResourceType, string>;

export function WorkspaceResourceList({
  moduleId,
  resources,
  totalResourceCount,
  now,
  canReorder,
  pending,
  onPreview,
  onEdit,
  onEditorial,
  onAvailability,
  onMove,
  onDrop,
}: {
  moduleId: string;
  resources: AdminSubjectWorkspaceResource[];
  totalResourceCount: number;
  now: string;
  canReorder: boolean;
  pending: boolean;
  onPreview: (moduleId: string, resourceId: string) => void;
  onEdit: (moduleId: string, resourceId: string) => void;
  onEditorial: (moduleId: string, resource: AdminSubjectWorkspaceResource) => void;
  onAvailability: (moduleId: string, resource: AdminSubjectWorkspaceResource) => void;
  onMove: (moduleId: string, resourceId: string, direction: -1 | 1) => void;
  onDrop: (moduleId: string, sourceId: string, targetId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (totalResourceCount === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="hidden grid-cols-[2.2rem_minmax(14rem,1.6fr)_minmax(7rem,.6fr)_minmax(8rem,.7fr)_minmax(8rem,.7fr)_minmax(9rem,.8fr)_7rem] gap-3 border-b border-border bg-surface/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted lg:grid">
        <span aria-hidden="true" />
        <span>Recurso</span>
        <span>Tipo</span>
        <span>Estado</span>
        <span>Información</span>
        <span>Última edición</span>
        <span className="text-right">Acciones</span>
      </div>

      <ul className="divide-y divide-border">
        {resources.map((resource, index) => (
          <li
            key={resource.id}
            onDragOver={(event) => {
              if (canReorder && draggingId) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId && draggingId !== resource.id) {
                onDrop(moduleId, draggingId, resource.id);
              }
              setDraggingId(null);
            }}
            className={`grid items-center gap-2 px-3 py-2.5 transition-colors lg:grid-cols-[2.2rem_minmax(14rem,1.6fr)_minmax(7rem,.6fr)_minmax(8rem,.7fr)_minmax(8rem,.7fr)_minmax(9rem,.8fr)_7rem] lg:gap-3 ${
              draggingId === resource.id ? "opacity-50" : "hover:bg-surface/60"
            }`}
          >
            <button
              type="button"
              draggable={canReorder}
              disabled={!canReorder || pending}
              onDragStart={(event) => {
                setDraggingId(resource.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDraggingId(null)}
              aria-label={`Arrastrar ${resource.title} para reordenar`}
              title={canReorder ? "Arrastrar para reordenar" : "Limpia búsqueda y filtro de estado para reordenar"}
              className="hidden h-9 w-8 cursor-grab items-center justify-center rounded-md text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-35 lg:inline-flex"
            >
              <GripVertical aria-hidden="true" className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${resourceIconClasses[resource.type]}`}
              >
                <ResourceTypeIcon type={resource.type} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {resource.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted lg:hidden">
                  {resource.information ?? resource.authorName}
                </p>
                <span className="mt-1 flex flex-wrap items-center gap-2 lg:hidden">
                  <ResourceTypeBadge type={resource.type} appearance="inline" />
                  {resource.isActive ? (
                    <PublicationStatusBadge status={resource.publicationStatus} compact />
                  ) : (
                    <span className="text-xs font-medium text-muted">Archivado</span>
                  )}
                </span>
              </div>
            </div>

            <span className="hidden lg:block">
              <ResourceTypeBadge type={resource.type} appearance="inline" />
            </span>
            <span className="hidden lg:block">
              {resource.isActive ? (
                <PublicationStatusBadge status={resource.publicationStatus} compact />
              ) : (
                <span className="text-xs font-medium text-muted">Archivado</span>
              )}
            </span>
            <span className="hidden text-xs text-muted lg:block">
              {resource.information ?? "—"}
            </span>
            <span className="hidden text-xs leading-4 text-muted lg:block">
              <time dateTime={resource.updatedAt} title={new Date(resource.updatedAt).toLocaleString("es-CR")}>
                {formatRelativeWorkspaceDate(resource.updatedAt, now)}
              </time>
              <span className="block truncate">{resource.authorName}</span>
            </span>

            <div className="flex items-center justify-end gap-1 max-lg:col-start-1 max-lg:row-start-2 max-lg:justify-start">
              <button
                type="button"
                onClick={() => onPreview(moduleId, resource.id)}
                aria-label={`Vista previa de ${resource.title}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
              </button>
              {resource.canEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(moduleId, resource.id)}
                  aria-label={`Editar ${resource.title}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                </button>
              ) : null}
              <WorkspaceActionMenu
                label={`Más opciones para ${resource.title}`}
                placement="down"
              >
                  {resource.isActive ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onEditorial(moduleId, resource)}
                      className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-50"
                    >
                      <Send aria-hidden="true" className="h-4 w-4" />
                      {resource.publicationStatus === PublicationStatus.PUBLISHED
                        ? "Despublicar"
                        : "Publicar"}
                    </button>
                  ) : null}
                  {(resource.isActive ? resource.canArchive : resource.canReactivate) ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onAvailability(moduleId, resource)}
                      className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-50"
                    >
                      {resource.isActive ? (
                        <Archive aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      )}
                      {resource.isActive ? "Archivar" : "Reactivar"}
                    </button>
                  ) : null}
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    disabled={!canReorder || pending || index === 0}
                    onClick={() => onMove(moduleId, resource.id, -1)}
                    className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-40"
                  >
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    Mover arriba
                  </button>
                  <button
                    type="button"
                    disabled={!canReorder || pending || index === resources.length - 1}
                    onClick={() => onMove(moduleId, resource.id, 1)}
                    className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-40"
                  >
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    Mover abajo
                  </button>
              </WorkspaceActionMenu>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

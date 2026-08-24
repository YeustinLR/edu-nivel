"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  FilePlus2,
  GripVertical,
  Pencil,
  RotateCcw,
  Send,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { PublicationStatus } from "@/generated/prisma/enums";
import {
  AudienceBadge,
  PublicationStatusBadge,
} from "@/modules/content/components/admin/ContentBadges";
import { formatRelativeWorkspaceDate } from "@/modules/content/components/admin/workspace/content-workspace-presentation";
import { WorkspaceActionMenu } from "@/modules/content/components/admin/workspace/WorkspaceActionMenu";
import { WorkspaceResourceList } from "@/modules/content/components/admin/workspace/WorkspaceResourceList";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import type {
  AdminSubjectWorkspaceModule,
  AdminSubjectWorkspaceResource,
} from "@/server/content/admin-module-list-queries";

export function WorkspaceModuleCard({
  moduleRecord,
  position,
  moduleCount,
  visibleResources,
  open,
  now,
  canReorderModules,
  canReorderResources,
  pending,
  dragging,
  dragTarget,
  onToggle,
  onDragStart,
  onDragOverModule,
  onDragEnd,
  onDropModule,
  onEditModule,
  onAddResource,
  onDuplicate,
  onModuleEditorial,
  onModuleAvailability,
  onMoveModule,
  onPreviewResource,
  onEditResource,
  onResourceEditorial,
  onResourceAvailability,
  onMoveResource,
  onDropResource,
}: {
  moduleRecord: AdminSubjectWorkspaceModule;
  position: number;
  moduleCount: number;
  visibleResources: AdminSubjectWorkspaceResource[];
  open: boolean;
  now: string;
  canReorderModules: boolean;
  canReorderResources: boolean;
  pending: boolean;
  dragging: boolean;
  dragTarget: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onDragOverModule: (pointerY: number, targetBounds: DOMRect) => void;
  onDragEnd: () => void;
  onDropModule: () => void;
  onEditModule: () => void;
  onAddResource: () => void;
  onDuplicate: () => void;
  onModuleEditorial: () => void;
  onModuleAvailability: () => void;
  onMoveModule: (direction: -1 | 1) => void;
  onPreviewResource: (moduleId: string, resourceId: string) => void;
  onEditResource: (moduleId: string, resourceId: string) => void;
  onResourceEditorial: (moduleId: string, resource: AdminSubjectWorkspaceResource) => void;
  onResourceAvailability: (moduleId: string, resource: AdminSubjectWorkspaceResource) => void;
  onMoveResource: (moduleId: string, resourceId: string, direction: -1 | 1) => void;
  onDropResource: (moduleId: string, sourceId: string, targetId: string) => void;
}) {
  const expanded = open;
  const panelId = `subject-workspace-module-${moduleRecord.id}`;
  const resourceCount = moduleRecord.resources.length;
  const moduleHref = `/dashboard/admin/content/modules/${encodeURIComponent(moduleRecord.id)}`;
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  return (
    <article
      onDragOver={(event) => {
        if (!canReorderModules) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOverModule(event.clientY, event.currentTarget.getBoundingClientRect());
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropModule();
      }}
      className={`relative rounded-xl border bg-card transition-[transform,border-color,box-shadow,opacity,background-color] duration-200 ${
        expanded
          ? "border-secondary/35 shadow-[0_10px_30px_-24px_rgba(124,58,237,.7)]"
          : "border-border hover:border-secondary/20"
      } ${
        dragging
          ? "scale-[0.985] cursor-grabbing border-secondary/50 bg-secondary/[0.035] opacity-60 shadow-[0_18px_45px_-24px_rgba(124,58,237,.75)] ring-2 ring-secondary/15"
          : ""
      } ${dragTarget && !dragging ? "border-secondary/40 shadow-[0_12px_32px_-25px_rgba(124,58,237,.75)] ring-2 ring-secondary/10" : ""}`}
    >
      {dragTarget && !dragging ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-[7px] left-3 right-3 z-10 h-0.5 animate-pulse rounded-full bg-secondary shadow-[0_0_0_3px_rgba(124,58,237,.10)] motion-reduce:animate-none"
        >
          <span className="absolute -left-0.5 -top-[3px] h-2 w-2 rounded-full bg-secondary" />
        </span>
      ) : null}

      <div
        ref={dragPreviewRef}
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 flex max-w-sm items-center gap-3 rounded-xl border border-secondary/30 bg-card px-3 py-2.5 shadow-2xl ring-1 ring-secondary/10"
      >
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-white">
          {position}
        </span>
        <span className="truncate text-sm font-semibold text-foreground">
          {moduleRecord.title}
        </span>
      </div>

      <div className="flex items-start gap-2 p-3 sm:gap-3 sm:p-4">
        <button
          type="button"
          draggable={canReorderModules}
          disabled={!canReorderModules || pending}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", moduleRecord.id);
            if (dragPreviewRef.current) {
              event.dataTransfer.setDragImage(dragPreviewRef.current, 24, 20);
            }
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          aria-label={`Arrastrar ${moduleRecord.title} para reordenar`}
          title={
            canReorderModules
              ? "Arrastrar para reordenar"
              : "Limpia la búsqueda para reordenar"
          }
          className={`mt-0.5 hidden h-9 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-secondary/10 hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-30 lg:inline-flex ${dragging ? "cursor-grabbing bg-secondary/10 text-secondary" : "cursor-grab"}`}
        >
          <GripVertical aria-hidden="true" className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <span className="sr-only">{expanded ? "Contraer" : "Expandir"} {moduleRecord.title}</span>
        </button>

        <div className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 px-2 text-sm font-semibold text-secondary">
          {position}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <span className="block truncate text-sm font-semibold text-foreground sm:text-[15px]">
            {moduleRecord.title}
          </span>
          <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted sm:text-sm">
            {moduleRecord.description ?? "Sin descripción."}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {moduleRecord.isActive ? (
              <PublicationStatusBadge status={moduleRecord.publicationStatus} compact />
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                <Archive aria-hidden="true" className="h-3.5 w-3.5" /> Archivado
              </span>
            )}
            <AudienceBadge audience={moduleRecord.audience} appearance="inline" />
            <span className="text-xs text-muted">
              {resourceCount} {resourceCount === 1 ? "recurso" : "recursos"}
            </span>
            <span className="hidden text-xs text-muted lg:inline">
              Editado {formatRelativeWorkspaceDate(moduleRecord.updatedAt, now)} por {moduleRecord.authorName}
            </span>
          </span>
        </button>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          {moduleRecord.canEdit ? (
            <button
              type="button"
              onClick={onEditModule}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Editar módulo
            </button>
          ) : null}
          {moduleRecord.canAddResource ? (
            <button
              type="button"
              onClick={onAddResource}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <FilePlus2 aria-hidden="true" className="h-4 w-4" />
              Añadir recurso
            </button>
          ) : null}
        </div>

        <WorkspaceActionMenu label={`Más opciones para ${moduleRecord.title}`}>
            {moduleRecord.canEdit ? (
              <button type="button" onClick={onEditModule} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated xl:hidden">
                <Pencil aria-hidden="true" className="h-4 w-4" /> Editar módulo
              </button>
            ) : null}
            {moduleRecord.canAddResource ? (
              <button type="button" onClick={onAddResource} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated xl:hidden">
                <FilePlus2 aria-hidden="true" className="h-4 w-4" /> Añadir recurso
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={onDuplicate}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-50"
            >
              <Copy aria-hidden="true" className="h-4 w-4" /> Duplicar
            </button>
            {moduleRecord.isActive && moduleRecord.publicationStatus !== PublicationStatus.IN_REVIEW ? (
              <button type="button" disabled={pending} onClick={onModuleEditorial} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-50">
                <Send aria-hidden="true" className="h-4 w-4" />
                {moduleRecord.publicationStatus === PublicationStatus.PUBLISHED ? "Despublicar" : "Publicar"}
              </button>
            ) : null}
            {(moduleRecord.isActive ? moduleRecord.canArchive : moduleRecord.canReactivate) ? (
              <button type="button" disabled={pending} onClick={onModuleAvailability} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-50">
                {moduleRecord.isActive ? <Archive aria-hidden="true" className="h-4 w-4" /> : <RotateCcw aria-hidden="true" className="h-4 w-4" />}
                {moduleRecord.isActive ? "Archivar" : "Reactivar"}
              </button>
            ) : null}
            <div className="my-1 border-t border-border" />
            <button type="button" disabled={!canReorderModules || pending || position === 1} onClick={() => onMoveModule(-1)} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-40">
              <ArrowUp aria-hidden="true" className="h-4 w-4" /> Mover arriba
            </button>
            <button type="button" disabled={!canReorderModules || pending || position === moduleCount} onClick={() => onMoveModule(1)} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-surface-elevated disabled:opacity-40">
              <ArrowDown aria-hidden="true" className="h-4 w-4" /> Mover abajo
            </button>
            <Link href={moduleHref} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm hover:bg-surface-elevated">
              <Settings aria-hidden="true" className="h-4 w-4" /> Opciones avanzadas
            </Link>
        </WorkspaceActionMenu>
      </div>

      <ModuleResourcePanel
        id={panelId}
        open={expanded}
        allowOverflowWhenOpen
        className="border-t border-secondary/15 bg-surface/45 p-3 sm:p-4"
      >
        {resourceCount === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-5 py-8 text-center">
            <FilePlus2 aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              Este módulo todavía no tiene recursos.
            </p>
            {moduleRecord.canAddResource ? (
              <button type="button" onClick={onAddResource} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-medium text-white hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
                <FilePlus2 aria-hidden="true" className="h-4 w-4" /> Añadir primer recurso
              </button>
            ) : null}
          </div>
        ) : visibleResources.length > 0 ? (
          <WorkspaceResourceList
            moduleId={moduleRecord.id}
            resources={visibleResources}
            totalResourceCount={resourceCount}
            now={now}
            canReorder={canReorderResources}
            pending={pending}
            onPreview={onPreviewResource}
            onEdit={onEditResource}
            onEditorial={onResourceEditorial}
            onAvailability={onResourceAvailability}
            onMove={onMoveResource}
            onDrop={onDropResource}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-background px-4 py-7 text-center text-sm text-muted">
            Ningún recurso de este módulo coincide con los filtros.
          </p>
        )}
      </ModuleResourcePanel>
    </article>
  );
}

"use client";

import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  AudienceBadge,
  PublicationStatusBadge,
  ResourceTypeBadge,
  ResourceTypeIcon,
} from "@/modules/content/components/admin/ContentBadges";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import type { AdminModuleRow } from "@/server/content/admin-module-list-queries";

function ModuleMetadata({ module }: { module: AdminModuleRow }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {module.isActive ? (
        <PublicationStatusBadge status={module.publicationStatus} compact />
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
          Archivado
        </span>
      )}
      <AudienceBadge audience={module.audience} appearance="inline" />
    </span>
  );
}

function ModuleResources({ module }: { module: AdminModuleRow }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold text-foreground">Recursos</h4>
          <span className="text-xs text-muted">{module.resourceCount}</span>
        </div>
        <Link
          href={`/dashboard/admin/content/modules/${encodeURIComponent(module.id)}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-9"
        >
          Gestionar módulo
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>

      {module.resources.length > 0 ? (
        <ul className="mt-2 divide-y divide-border border-t border-border">
          {module.resources.map((resource) => (
            <li key={resource.id}>
              <Link
                href={`/dashboard/admin/content/resources/${encodeURIComponent(resource.id)}`}
                className="group flex min-h-14 items-center gap-2.5 py-2.5 transition-colors hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:px-2"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-muted">
                  <ResourceTypeIcon
                    type={resource.type}
                    className="h-3.5 w-3.5"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {resource.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
                    <ResourceTypeBadge
                      type={resource.type}
                      appearance="inline"
                    />
                    <span aria-hidden="true">·</span>
                    <span>{resource.authorName}</span>
                    {!resource.isActive ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Archive aria-hidden="true" className="h-3 w-3" />
                          Archivado
                        </span>
                      </>
                    ) : null}
                  </span>
                  {resource.isActive ? (
                    <span className="mt-1 inline-flex sm:hidden">
                      <PublicationStatusBadge
                        status={resource.publicationStatus}
                        compact
                      />
                    </span>
                  ) : null}
                </span>
                {resource.isActive ? (
                  <span className="hidden shrink-0 sm:inline-flex">
                    <PublicationStatusBadge
                      status={resource.publicationStatus}
                      compact
                    />
                  </span>
                ) : null}
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 flex items-center gap-2 border-t border-border py-4 text-xs text-muted">
          <FileText aria-hidden="true" className="h-4 w-4" />
          Este módulo todavía no tiene recursos.
        </div>
      )}
    </div>
  );
}

export function AdminSubjectModuleList({
  modules,
  selectedModuleId,
  audienceLabel,
}: {
  modules: AdminModuleRow[];
  selectedModuleId?: string;
  audienceLabel?: string;
}) {
  const [openModuleId, setOpenModuleId] = useState<string | null>(
    selectedModuleId ?? null,
  );

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 py-10 text-center">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-elevated text-muted">
          <BookOpen aria-hidden="true" className="h-4 w-4" />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          No hay módulos que mostrar
        </h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
          {audienceLabel
            ? `Todavía no hay módulos disponibles para ${audienceLabel}.`
            : "Selecciona otro módulo o crea el primero de esta materia."}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {modules.map((module) => {
        const isOpen = openModuleId === module.id;
        const panelId = `admin-module-${module.id}`;

        return (
          <li key={module.id}>
            <article
              className={`transition-[background-color,box-shadow] duration-150 ${
                isOpen
                  ? "bg-surface/60 shadow-[inset_2px_0_0_var(--secondary)]"
                  : "bg-background hover:bg-surface/50"
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenModuleId(isOpen ? null : module.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:px-5"
              >
                <span className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-muted sm:inline-flex">
                  <BookOpen aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {module.title}
                  </span>
                  {module.description ? (
                    <span className="mt-0.5 block truncate text-sm text-muted">
                      {module.description}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-xs text-muted">
                    {module.resourceCount}{" "}
                    {module.resourceCount === 1 ? "recurso" : "recursos"} ·
                    Creado por {module.authorName}
                  </span>
                  <span className="mt-2 flex md:hidden">
                    <ModuleMetadata module={module} />
                  </span>
                </span>
                <span className="mt-0.5 hidden shrink-0 md:flex">
                  <ModuleMetadata module={module} />
                </span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted">
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  />
                </span>
              </button>

              <ModuleResourcePanel
                id={panelId}
                open={isOpen}
                className="border-t border-border bg-background/70 px-4 py-3 sm:px-5 sm:pl-16"
              >
                <ModuleResources module={module} />
              </ModuleResourcePanel>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { BookOpen, ChevronDown, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  AudienceBadge,
  PublicationStatusBadge,
  ResourceTypeBadge,
} from "@/modules/content/components/admin/ContentBadges";
import { secondaryActionClass } from "@/modules/content/components/admin/ContentPageHeader";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import type { AdminModuleRow } from "@/server/content/admin-module-list-queries";

export function AdminSubjectModuleList({
  modules,
  selectedModuleId,
}: {
  modules: AdminModuleRow[];
  selectedModuleId?: string;
}) {
  const [openModuleId, setOpenModuleId] = useState<string | null>(
    selectedModuleId ?? null,
  );

  if (modules.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <BookOpen aria-hidden="true" className="mx-auto h-9 w-9 text-muted" />
        <h3 className="mt-3 font-semibold text-foreground">
          No hay módulos que mostrar
        </h3>
        <p className="mt-1 text-sm text-muted">
          Selecciona otro módulo o crea el primero de esta materia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 sm:p-5">
      {modules.map((module) => {
        const isOpen = openModuleId === module.id;
        const panelId = `admin-module-${module.id}`;

        return (
          <article
            key={module.id}
            className={`overflow-hidden rounded-xl border bg-background transition-colors ${
              isOpen ? "border-secondary/40" : "border-border"
            }`}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenModuleId(isOpen ? null : module.id)}
              className="flex w-full items-start gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:p-5"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <BookOpen aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {module.title}
                  </span>
                  <PublicationStatusBadge status={module.publicationStatus} />
                  <AudienceBadge audience={module.audience} />
                  {!module.isActive ? (
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
                      Archivado
                    </span>
                  ) : null}
                </span>
                {module.description ? (
                  <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted">
                    {module.description}
                  </span>
                ) : null}
                <span className="mt-2 block text-xs text-muted">
                  {module.resourceCount}{" "}
                  {module.resourceCount === 1 ? "recurso" : "recursos"} · {module.authorName}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`mt-2 h-5 w-5 shrink-0 text-muted transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <ModuleResourcePanel
              id={panelId}
              open={isOpen}
              className="border-t border-border p-4 sm:p-5"
            >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground">Recursos</h4>
                    <p className="mt-0.5 text-xs text-muted">
                      Contenido asociado a este módulo.
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/admin/content/modules/${encodeURIComponent(module.id)}`}
                    className={secondaryActionClass}
                  >
                    Gestionar módulo
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>

                {module.resources.length > 0 ? (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {module.resources.map((resource) => (
                      <li key={resource.id}>
                        <Link
                          href={`/dashboard/admin/content/resources/${encodeURIComponent(resource.id)}`}
                          className="flex min-h-20 items-center gap-3 px-4 py-3 hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary"
                        >
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-muted">
                            <FileText aria-hidden="true" className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {resource.title}
                              </span>
                              <ResourceTypeBadge type={resource.type} showIcon />
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                              <PublicationStatusBadge status={resource.publicationStatus} />
                              <span>{resource.authorName}</span>
                              {!resource.isActive ? <span>Archivado</span> : null}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
                    Este módulo todavía no tiene recursos.
                  </p>
                )}
            </ModuleResourcePanel>
          </article>
        );
      })}
    </div>
  );
}

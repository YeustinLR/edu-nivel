"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  PublicationStatusBadge,
  ResourceTypeBadge,
} from "@/modules/content/components/admin/ContentBadges";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import type { CollaboratorTeamModule } from "@/server/content/collaborator-content-queries";

export function CollaboratorTeamCatalog({
  modules,
}: {
  modules: CollaboratorTeamModule[];
}) {
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const visibleModules = selectedModuleId
    ? modules.filter((module) => module.id === selectedModuleId)
    : modules;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Catálogo del equipo
          </h2>
          <p className="mt-1 text-sm text-muted">
            Los borradores ajenos muestran únicamente metadatos; el contenido
            completo aparece cuando está publicado.
          </p>
        </div>
        {modules.length > 0 ? (
          <label className="block w-full max-w-md space-y-1.5 text-sm font-medium text-foreground">
            Filtrar por módulo
            <select
              value={selectedModuleId}
              onChange={(event) => {
                const moduleId = event.target.value;
                setSelectedModuleId(moduleId);
                setOpenModuleId(moduleId || null);
              }}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20"
            >
              <option value="">Todos los módulos</option>
              {modules.map((module, index) => (
                <option key={module.id} value={module.id}>
                  Módulo {index + 1} — {module.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {modules.length > 0 ? (
        <div className="space-y-3">
          {visibleModules.map((module) => {
            const isOpen = openModuleId === module.id;
            const panelId = `team-module-${module.id}`;

            return (
            <article
              key={module.id}
              className={`overflow-hidden rounded-xl border bg-card transition-colors ${isOpen ? "border-secondary/40" : "border-border"}`}
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
                    <span className="font-semibold text-foreground">{module.title}</span>
                    <PublicationStatusBadge status={module.publicationStatus} />
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Nivel {module.subject.level.levelNumber} · {module.subject.name} · {module.createdBy.name}
                  </span>
                  <span className="mt-2 block text-xs text-muted">
                    {module.publicationStatus === "PUBLISHED"
                      ? `${module.resources.length} ${module.resources.length === 1 ? "recurso" : "recursos"}`
                      : "Contenido en preparación"}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`mt-2 h-5 w-5 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              <ModuleResourcePanel
                id={panelId}
                open={isOpen}
                className="border-t border-border p-4 sm:p-5"
              >
                  {module.publicationStatus === "PUBLISHED" ? (
                    module.resources.length > 0 ? (
                      <ul className="space-y-2">
                        {module.resources.map((resource) => (
                          <li
                            key={resource.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {resource.title}
                              </span>
                              <span className="mt-1 block">
                                <ResourceTypeBadge type={resource.type} showIcon />
                              </span>
                            </span>
                            <Link
                              href={`/dashboard/collaborator/content/resources/${encodeURIComponent(resource.id)}`}
                              scroll={false}
                              className="shrink-0 text-xs font-medium text-secondary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                            >
                              Ver contenido
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
                        Este módulo todavía no tiene recursos publicados.
                      </p>
                    )
                  ) : (
                    <p className="rounded-lg bg-background p-3 text-xs leading-5 text-muted">
                      Contenido en preparación. Solo se muestran el título, el
                      autor y el estado editorial.
                    </p>
                  )}
              </ModuleResourcePanel>
            </article>
          );})}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Todavía no hay contenido creado por otros autores.
        </p>
      )}
    </section>
  );
}

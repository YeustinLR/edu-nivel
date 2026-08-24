"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  AudienceBadge,
  PublicationStatusBadge,
  ResourceTypeBadge,
  ResourceTypeIcon,
} from "@/modules/content/components/admin/ContentBadges";
import { ModuleAudienceSelector } from "@/modules/content/components/shared/ModuleAudienceSelector";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import {
  moduleMatchesAudienceSelection,
  type ModuleAudienceSelection,
} from "@/modules/content/domain/content-audience";
import type { CollaboratorTeamModule } from "@/server/content/collaborator-content-queries";

function TeamModuleMetadata({ module }: { module: CollaboratorTeamModule }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <PublicationStatusBadge status={module.publicationStatus} compact />
      <AudienceBadge audience={module.audience} appearance="inline" />
    </span>
  );
}

function EmptyTeamState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-elevated text-muted">
        <BookOpen aria-hidden="true" className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted">
        El contenido disponible aparecerá en esta lista.
      </p>
    </div>
  );
}

export function CollaboratorTeamCatalog({
  modules,
}: {
  modules: CollaboratorTeamModule[];
}) {
  const [audience, setAudience] =
    useState<ModuleAudienceSelection>("STUDENT");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const audienceModules = modules.filter((module) =>
    moduleMatchesAudienceSelection(module.audience, audience),
  );
  const visibleModules = selectedModuleId
    ? audienceModules.filter((module) => module.id === selectedModuleId)
    : audienceModules;

  return (
    <section
      aria-labelledby="team-modules-heading"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <h2
                id="team-modules-heading"
                className="font-semibold text-foreground"
              >
                Catálogo del equipo
              </h2>
              <span className="text-xs text-muted">
                {audienceModules.length}{" "}
                {audienceModules.length === 1 ? "módulo" : "módulos"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              El contenido en preparación muestra únicamente sus metadatos.
            </p>
          </div>
          {modules.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ModuleAudienceSelector
                value={audience}
                onValueChange={(nextAudience) => {
                  setAudience(nextAudience);
                  setSelectedModuleId("");
                  setOpenModuleId(null);
                }}
              />
              <label className="block sm:w-64">
                <span className="sr-only">Filtrar por módulo</span>
                <select
                  value={selectedModuleId}
                  onChange={(event) => {
                    const moduleId = event.target.value;
                    setSelectedModuleId(moduleId);
                    setOpenModuleId(moduleId || null);
                  }}
                  className="min-h-11 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-normal text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20 sm:min-h-9"
                >
                  <option value="">Todos los módulos</option>
                  {audienceModules.map((module, index) => (
                    <option key={module.id} value={module.id}>
                      Módulo {index + 1} — {module.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {modules.length === 0 ? (
        <EmptyTeamState message="Todavía no hay contenido creado por el equipo" />
      ) : visibleModules.length === 0 ? (
        <EmptyTeamState
          message={`No hay módulos del equipo para ${audience === "STUDENT" ? "estudiantes" : "docentes"}`}
        />
      ) : (
        <ul className="divide-y divide-border">
          {visibleModules.map((module) => {
            const isOpen = openModuleId === module.id;
            const panelId = `team-module-${module.id}`;

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
                      <span className="mt-1 block text-xs text-muted">
                        Nivel {module.subject.level.levelNumber} ·{" "}
                        {module.subject.name} · Creado por {module.createdBy.name}
                      </span>
                      <span className="mt-2 flex md:hidden">
                        <TeamModuleMetadata module={module} />
                      </span>
                    </span>
                    <span className="mt-0.5 hidden shrink-0 md:flex">
                      <TeamModuleMetadata module={module} />
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
                    {module.publicationStatus === "PUBLISHED" ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-sm font-semibold text-foreground">
                            Recursos
                          </h4>
                          <span className="text-xs text-muted">
                            {module.resources.length}
                          </span>
                        </div>
                        {module.resources.length > 0 ? (
                          <ul className="mt-2 divide-y divide-border border-t border-border">
                            {module.resources.map((resource) => (
                              <li key={resource.id}>
                                <Link
                                  href={`/dashboard/collaborator/content/resources/${encodeURIComponent(resource.id)}`}
                                  scroll={false}
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
                                    <span className="mt-0.5 block">
                                      <ResourceTypeBadge
                                        type={resource.type}
                                        appearance="inline"
                                      />
                                    </span>
                                  </span>
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
                            Este módulo todavía no tiene recursos publicados.
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="flex items-start gap-2 text-xs leading-5 text-muted">
                        <Info
                          aria-hidden="true"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        />
                        Contenido en preparación. Solo se muestran el título, el
                        autor y el estado editorial.
                      </p>
                    )}
                  </ModuleResourcePanel>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

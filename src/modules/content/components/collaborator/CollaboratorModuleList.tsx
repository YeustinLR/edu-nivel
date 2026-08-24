"use client";

import type { PublicationStatus } from "@/generated/prisma/enums";
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  publishDirectAction,
  submitForReviewAction,
  withdrawReviewAction,
} from "@/modules/content/actions/content-actions";
import {
  AudienceBadge,
  PublicationStatusBadge,
  ResourceTypeBadge,
  ResourceTypeIcon,
} from "@/modules/content/components/admin/ContentBadges";
import { CollaboratorSubmitButton } from "@/modules/content/components/collaborator/CollaboratorSubmitButton";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditModuleForm } from "@/modules/content/components/editor/EditModuleForm";
import { ModuleAudienceSelector } from "@/modules/content/components/shared/ModuleAudienceSelector";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import {
  moduleMatchesAudienceSelection,
  type ModuleAudienceSelection,
} from "@/modules/content/domain/content-audience";
import { getCollaboratorEditorialTransitions } from "@/modules/content/domain/editorial-workflow";
import type { CollaboratorModule } from "@/server/content/collaborator-content-queries";

function EditorialButton({
  id,
  type,
  status,
}: {
  id: string;
  type: "module" | "resource";
  status: PublicationStatus;
}) {
  const transition = getCollaboratorEditorialTransitions(type, status)[0];
  if (!transition) return null;
  const isPublish = transition === "PUBLISH_DIRECT";
  const isWithdraw = transition === "WITHDRAW_REVIEW";
  const action = isPublish
    ? publishDirectAction
    : isWithdraw
      ? withdrawReviewAction
      : submitForReviewAction;

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="type" value={type} />
      <CollaboratorSubmitButton
        label={
          isPublish
            ? "Publicar"
            : isWithdraw
              ? "Retirar revisión"
              : "Enviar a revisión"
        }
        pendingLabel="Procesando…"
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 sm:min-h-9"
      />
    </form>
  );
}

function ModuleMetadata({ module }: { module: CollaboratorModule }) {
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

function CollaboratorResources({ module }: { module: CollaboratorModule }) {
  return (
    <div className="mt-3">
      <div className="flex items-baseline gap-2">
        <h4 className="text-sm font-semibold text-foreground">Recursos</h4>
        <span className="text-xs text-muted">{module.resources.length}</span>
      </div>

      {module.resources.length > 0 ? (
        <ul className="mt-2 divide-y divide-border border-t border-border">
          {module.resources.map((resource) => (
            <li
              key={resource.id}
              className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-muted">
                  <ResourceTypeIcon type={resource.type} className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {resource.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <ResourceTypeBadge
                      type={resource.type}
                      appearance="inline"
                    />
                    {resource.isActive ? (
                      <PublicationStatusBadge
                        status={resource.publicationStatus}
                        compact
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Archive aria-hidden="true" className="h-3 w-3" />
                        Archivado
                      </span>
                    )}
                  </div>
                  {resource.reviewNote ? (
                    <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-secondary">
                      <MessageSquareText
                        aria-hidden="true"
                        className="mt-0.5 h-3 w-3 shrink-0"
                      />
                      {resource.reviewNote}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-9 sm:pl-0">
                {resource.isActive ? (
                  <EditorialButton
                    id={resource.id}
                    type="resource"
                    status={resource.publicationStatus}
                  />
                ) : null}
                <Link
                  href={`/dashboard/collaborator/content/resources/${encodeURIComponent(resource.id)}`}
                  scroll={false}
                  className="inline-flex min-h-11 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-9"
                >
                  Ver contenido
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </div>
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

function EmptyModuleState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-elevated text-muted">
        <BookOpen aria-hidden="true" className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted">
        Los módulos disponibles aparecerán en esta lista.
      </p>
    </div>
  );
}

export function CollaboratorModuleList({
  modules,
}: {
  modules: CollaboratorModule[];
}) {
  if (modules.length === 0) {
    return (
      <section
        aria-labelledby="collaborator-modules-heading"
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-baseline gap-2">
            <h2
              id="collaborator-modules-heading"
              className="font-semibold text-foreground"
            >
              Mis módulos
            </h2>
            <span className="text-xs text-muted">0 módulos</span>
          </div>
        </div>
        <EmptyModuleState message="Todavía no has creado módulos" />
      </section>
    );
  }

  return <InteractiveCollaboratorModuleList modules={modules} />;
}

function InteractiveCollaboratorModuleList({
  modules,
}: {
  modules: CollaboratorModule[];
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
      aria-labelledby="collaborator-modules-heading"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-baseline gap-2">
            <h2
              id="collaborator-modules-heading"
              className="font-semibold text-foreground"
            >
              Mis módulos
            </h2>
            <span className="text-xs text-muted">
              {audienceModules.length}{" "}
              {audienceModules.length === 1 ? "módulo" : "módulos"}
            </span>
          </div>
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
        </div>
      </div>

      {visibleModules.length === 0 ? (
        <EmptyModuleState
          message={`No tienes módulos para ${audience === "STUDENT" ? "estudiantes" : "docentes"}`}
        />
      ) : (
        <ul className="divide-y divide-border">
          {visibleModules.map((module) => {
            const isEditable = [
              "DRAFT",
              "CHANGES_REQUESTED",
              "UNPUBLISHED",
              "PUBLISHED",
            ].includes(module.publicationStatus);
            const canChangeAvailability = [
              "DRAFT",
              "CHANGES_REQUESTED",
              "UNPUBLISHED",
            ].includes(module.publicationStatus);
            const isOpen = openModuleId === module.id;
            const panelId = `collaborator-module-${module.id}`;

            return (
              <li key={module.id}>
                <article
                  className={`transition-[background-color,box-shadow] duration-150 ${
                    isOpen
                      ? "bg-surface/60 shadow-[inset_2px_0_0_var(--secondary)]"
                      : "bg-background hover:bg-surface/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenModuleId(isOpen ? null : module.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:px-5"
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
                          Nivel {module.subject.level.levelNumber} ·{" "}
                          {module.subject.name} · {module.resources.length}{" "}
                          {module.resources.length === 1 ? "recurso" : "recursos"}
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
                    <div className="px-4 pb-3 sm:py-0 sm:pl-0 sm:pr-5">
                      {module.isActive ? (
                        <EditorialButton
                          id={module.id}
                          type="module"
                          status={module.publicationStatus}
                        />
                      ) : null}
                    </div>
                  </div>

                  <ModuleResourcePanel
                    id={panelId}
                    open={isOpen}
                    className="border-t border-border bg-background/70 px-4 py-3 sm:px-5 sm:pl-16"
                  >
                    {module.reviewNote ? (
                      <p className="flex items-start gap-2 border-b border-border pb-3 text-xs leading-5 text-secondary">
                        <MessageSquareText
                          aria-hidden="true"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        />
                        <span>
                          <span className="font-medium">Revisión:</span>{" "}
                          {module.reviewNote}
                        </span>
                      </p>
                    ) : null}

                    {isEditable ? (
                      <details className="border-b border-border py-3">
                        <summary className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
                          Editar módulo y disponibilidad
                        </summary>
                        <div className="mt-4 space-y-5">
                          <EditModuleForm
                            moduleRecord={{
                              id: module.id,
                              title: module.title,
                              description: module.description,
                              audience: module.audience,
                              updatedAt: module.updatedAt.toISOString(),
                            }}
                          />
                          <ContentAvailabilityControl
                            type="module"
                            id={module.id}
                            isActive={module.isActive}
                            updatedAt={module.updatedAt.toISOString()}
                            canChange={
                              canChangeAvailability &&
                              (module.isActive ||
                                (module.subject.isActive &&
                                  module.subject.level.isActive))
                            }
                            unavailableReason="Los módulos publicados se editan en línea, pero solo un administrador puede retirarlos del catálogo."
                          />
                        </div>
                      </details>
                    ) : null}

                    <CollaboratorResources module={module} />
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

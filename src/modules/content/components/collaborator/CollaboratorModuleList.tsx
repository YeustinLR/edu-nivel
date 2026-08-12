"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PublicationStatus } from "@/generated/prisma/enums";

import {
  publishDirectAction,
  submitForReviewAction,
  withdrawReviewAction,
} from "@/modules/content/actions/content-actions";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditModuleForm } from "@/modules/content/components/editor/EditModuleForm";
import { CollaboratorSubmitButton } from "@/modules/content/components/collaborator/CollaboratorSubmitButton";
import {
  AudienceBadge,
  PublicationStatusBadge,
  ResourceTypeBadge,
} from "@/modules/content/components/admin/ContentBadges";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import type { CollaboratorModule } from "@/server/content/collaborator-content-queries";
import { getCollaboratorEditorialTransitions } from "@/modules/content/domain/editorial-workflow";

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
        label={isPublish ? "Publicar" : isWithdraw ? "Retirar revisión" : "Enviar a revisión"}
        pendingLabel="Procesando…"
        className="rounded-md bg-secondary/20 px-3 py-1 text-sm disabled:opacity-50"
      />
    </form>
  );
}

export function CollaboratorModuleList({
  modules,
}: {
  modules: CollaboratorModule[];
}) {
  if (modules.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border p-8 text-center">
        <h2 className="font-semibold text-foreground">No tienes módulos</h2>
        <p className="mt-1 text-sm text-muted">
          Crea tu primer borrador utilizando el formulario anterior.
        </p>
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
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const visibleModules = selectedModuleId
    ? modules.filter((module) => module.id === selectedModuleId)
    : modules;

  return (
    <section aria-labelledby="collaborator-modules-heading" className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="collaborator-modules-heading" className="text-lg font-semibold">
            Mis módulos
          </h2>
          <p className="mt-1 text-sm text-muted">
            Despliega un módulo para administrar sus recursos.
          </p>
        </div>
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
      </div>
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
          <article
            key={module.id}
            className={`overflow-hidden rounded-xl border bg-card transition-colors ${
              isOpen ? "border-secondary/40" : "border-border"
            }`}
          >
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenModuleId(isOpen ? null : module.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <BookOpen aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{module.title}</span>
                    <PublicationStatusBadge status={module.publicationStatus} />
                    <AudienceBadge audience={module.audience} />
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Nivel {module.subject.level.levelNumber} · {module.subject.name} · {module.resources.length} {module.resources.length === 1 ? "recurso" : "recursos"}
                  </span>
                  {module.description ? (
                    <span className="mt-1 line-clamp-2 block text-sm text-muted">
                      {module.description}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`mt-2 h-5 w-5 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <EditorialButton
                id={module.id}
                type="module"
                status={module.publicationStatus}
              />
            </div>

            <ModuleResourcePanel
              id={panelId}
              open={isOpen}
              className="space-y-4 border-t border-border p-4 sm:p-5"
            >
                {module.reviewNote ? (
                  <p className="rounded-lg bg-secondary/10 p-3 text-sm text-secondary">
                    Revisión: {module.reviewNote}
                  </p>
                ) : null}

                {isEditable ? (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
                      Editar módulo
                    </summary>
                    <div className="mt-3 space-y-5">
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

                {module.resources.length > 0 ? (
                  <div className="space-y-2">
                    {module.resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{resource.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <ResourceTypeBadge type={resource.type} showIcon />
                            <PublicationStatusBadge status={resource.publicationStatus} />
                          </div>
                          {resource.reviewNote ? (
                            <p className="mt-1 text-xs text-secondary">
                              Revisión: {resource.reviewNote}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <EditorialButton
                            id={resource.id}
                            type="resource"
                            status={resource.publicationStatus}
                          />
                          <Link
                            href={`/dashboard/collaborator/content/resources/${encodeURIComponent(resource.id)}`}
                            scroll={false}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                          >
                            Ver contenido
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
                    Este módulo todavía no tiene recursos.
                  </p>
                )}
            </ModuleResourcePanel>
          </article>
        );
      })}
    </section>
  );
}

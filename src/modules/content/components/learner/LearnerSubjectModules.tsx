"use client";

import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ResourceType } from "@/generated/prisma/enums";
import {
  ResourceTypeBadge,
} from "@/modules/content/components/admin/ContentBadges";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import { PdfCanvasViewer } from "@/modules/content/components/shared/PdfCanvasViewer";
import { YouTubeEmbed } from "@/modules/content/components/shared/YouTubeEmbed";

export type LearnerModuleResource = {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  lesson: { content: string; estimatedMinutes: number | null } | null;
  didacticResource: { content: string; objective: string | null } | null;
  youtubeVideo: { videoId: string; startAt: number | null } | null;
  linkResource: { url: string; openInNewTab: boolean } | null;
};

export type LearnerSubjectModule = {
  id: string;
  title: string;
  description: string | null;
  resources: LearnerModuleResource[];
};

function ResourcePresentation({
  resource,
  openPdfId,
  onOpenPdf,
  onClosePdf,
  student,
}: {
  resource: LearnerModuleResource;
  openPdfId: string | null;
  onOpenPdf: (resourceId: string) => void;
  onClosePdf: () => void;
  student: boolean;
}) {
  const cardClass =
    student
      ? "block rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] p-5 shadow-[0_5px_22px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-blue-300/70 hover:shadow-[0_12px_32px_rgba(15,23,42,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)]"
      : "block rounded-xl border border-border bg-background p-4 transition-colors hover:border-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  const surfaceClass = student
    ? "rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] p-5 shadow-[0_5px_22px_rgba(15,23,42,0.035)]"
    : "rounded-xl border border-border bg-background p-4";
  const titleClass = student
    ? "mt-3 font-bold text-[var(--student-text)]"
    : "mt-3 font-semibold text-foreground";
  const descriptionClass = student
    ? "mt-1 text-sm leading-6 text-[var(--student-muted)]"
    : "mt-1 text-sm text-muted";

  if (resource.type === ResourceType.NOTE) {
    return (
      <div className={surfaceClass}>
        <ResourceTypeBadge type={resource.type} showIcon />
        <p className={titleClass}>{resource.title}</p>
        {resource.description ? (
          <p className={`${descriptionClass} whitespace-pre-wrap`}>
            {resource.description}
          </p>
        ) : (
          <p className={descriptionClass}>Recurso sin adjunto.</p>
        )}
      </div>
    );
  }

  if (resource.type === ResourceType.PDF) {
    const isOpen = openPdfId === resource.id;

    return (
      <div
        className={`${surfaceClass} ${
          isOpen ? "md:col-span-2" : ""
        }`}
      >
        <ResourceTypeBadge type={resource.type} showIcon />
        <p className={titleClass}>{resource.title}</p>
        {resource.description ? (
          <p className={descriptionClass}>{resource.description}</p>
        ) : null}

        <div className="mt-4">
          {isOpen ? (
            <PdfCanvasViewer
              resourceId={resource.id}
              title={resource.title}
              onClose={onClosePdf}
            />
          ) : (
            <button
              type="button"
              onClick={() => onOpenPdf(resource.id)}
              className={student ? "inline-flex min-h-10 items-center rounded-xl border border-[var(--student-border)] px-3 py-2 text-sm font-bold text-[var(--student-blue)] hover:bg-[var(--student-blue-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)]" : "inline-flex min-h-10 items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"}
            >
              Ver PDF
            </button>
          )}
        </div>
      </div>
    );
  }

  if (
    resource.type === ResourceType.IMAGE ||
    resource.type === ResourceType.FILE ||
    resource.type === ResourceType.AUDIO
  ) {
    return (
      <Link
        href={`/api/resources/${resource.id}/file`}
        target="_blank"
        className={cardClass}
      >
        <div className="flex items-start justify-between gap-3">
          <ResourceTypeBadge type={resource.type} showIcon />
          <ExternalLink aria-hidden="true" className="h-4 w-4 text-muted" />
        </div>
        <p className={titleClass}>{resource.title}</p>
        {resource.description ? (
          <p className={`${descriptionClass} line-clamp-2`}>
            {resource.description}
          </p>
        ) : null}
      </Link>
    );
  }

  if (resource.type === ResourceType.YOUTUBE && resource.youtubeVideo) {
    return (
      <div className={surfaceClass}>
        <ResourceTypeBadge type={resource.type} showIcon />
        <p className={titleClass}>{resource.title}</p>
        {resource.description ? (
          <p className={descriptionClass}>
            {resource.description}
          </p>
        ) : null}
        <div className="mt-4">
          <YouTubeEmbed
            videoId={resource.youtubeVideo.videoId}
            title={resource.title}
            startAt={resource.youtubeVideo.startAt}
          />
        </div>
      </div>
    );
  }

  if (resource.type === ResourceType.LINK && resource.linkResource) {
    return (
      <a
        href={resource.linkResource.url}
        target={resource.linkResource.openInNewTab ? "_blank" : undefined}
        rel={resource.linkResource.openInNewTab ? "noreferrer" : undefined}
        className={cardClass}
      >
        <div className="flex items-start justify-between gap-3">
          <ResourceTypeBadge type={resource.type} showIcon />
          <ExternalLink aria-hidden="true" className="h-4 w-4 text-muted" />
        </div>
        <p className={titleClass}>{resource.title}</p>
        {resource.description ? (
          <p className={`${descriptionClass} line-clamp-2`}>
            {resource.description}
          </p>
        ) : null}
      </a>
    );
  }

  if (
    (resource.type === ResourceType.LESSON && resource.lesson) ||
    (resource.type === ResourceType.DIDACTIC && resource.didacticResource)
  ) {
    const content = resource.lesson?.content ?? resource.didacticResource?.content;

    return (
      <details className={student ? `${surfaceClass} open:border-blue-300/70` : "rounded-xl border border-border bg-background p-4 open:border-secondary/30"}>
        <summary className={student ? "cursor-pointer list-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)]" : "cursor-pointer list-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"}>
          <ResourceTypeBadge type={resource.type} showIcon />
          <p className={titleClass}>{resource.title}</p>
          <p className={descriptionClass}>
            Selecciona para leer el contenido.
          </p>
        </summary>
        <div className={student ? "mt-4 border-t border-[var(--student-border)] pt-4" : "mt-4 border-t border-border pt-4"}>
          {resource.didacticResource?.objective ? (
            <p className={student ? "mb-3 text-sm font-bold text-[var(--student-blue)]" : "mb-3 text-sm font-medium text-secondary"}>
              Objetivo: {resource.didacticResource.objective}
            </p>
          ) : null}
          <p className={student ? "whitespace-pre-wrap text-sm leading-7 text-[var(--student-text)]" : "whitespace-pre-wrap text-sm leading-7 text-foreground-secondary"}>
            {content}
          </p>
        </div>
      </details>
    );
  }

  return (
    <div className={surfaceClass}>
      <ResourceTypeBadge type={resource.type} showIcon />
      <p className={titleClass}>{resource.title}</p>
      <p className={descriptionClass}>
        Este tipo de recurso todavía no tiene un visor compatible.
      </p>
    </div>
  );
}

export function LearnerSubjectModules({
  modules,
  variant = "default",
}: {
  modules: LearnerSubjectModule[];
  variant?: "default" | "learner";
}) {
  const student = variant === "learner";
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [openPdfId, setOpenPdfId] = useState<string | null>(null);
  const visibleModules = selectedModuleId
    ? modules.filter((module) => module.id === selectedModuleId)
    : modules;

  return (
    <div className="space-y-4">
      <label className={student ? "block max-w-md space-y-1.5 text-sm font-semibold text-[var(--student-text)]" : "block max-w-md space-y-1.5 text-sm font-medium text-foreground"}>
        Filtrar por módulo
        <select
          value={selectedModuleId}
          onChange={(event) => {
            const moduleId = event.target.value;
            setSelectedModuleId(moduleId);
            setOpenModuleId(moduleId || null);
            setOpenPdfId(null);
          }}
          className={student ? "min-h-12 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-panel)] px-4 py-2.5 text-sm font-medium text-[var(--student-text)] outline-none focus-visible:border-[var(--student-blue)] focus-visible:ring-2 focus-visible:ring-blue-500/15" : "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20"}
        >
          <option value="">Todos los módulos</option>
          {modules.map((module, index) => (
            <option key={module.id} value={module.id}>
              Módulo {index + 1} — {module.title}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        {visibleModules.map((module, index) => {
          const isOpen = openModuleId === module.id;
          const panelId = `learner-module-${module.id}`;

          return (
            <article
              key={module.id}
              className={student
                ? `overflow-hidden rounded-[1.35rem] border bg-[var(--student-panel)] shadow-[0_5px_22px_rgba(15,23,42,0.035)] transition ${isOpen ? "border-blue-300/70 shadow-[0_12px_35px_rgba(15,23,42,0.07)]" : "border-[var(--student-border)]"}`
                : `overflow-hidden rounded-2xl border bg-card transition-colors ${isOpen ? "border-secondary/40" : "border-border"}`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => {
                  setOpenModuleId(isOpen ? null : module.id);
                  setOpenPdfId(null);
                }}
                className={student ? "flex w-full items-start gap-4 p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--student-blue)] sm:p-6" : "flex w-full items-start gap-3 p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:p-6"}
              >
                <span className={student ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]" : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"}>
                  <BookOpen aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={student ? "block text-xs font-bold uppercase tracking-wide text-[var(--student-blue)]" : "block text-xs font-semibold uppercase tracking-wide text-secondary"}>
                    Módulo {selectedModuleId ? modules.findIndex((item) => item.id === module.id) + 1 : index + 1}
                  </span>
                  <span className={student ? "mt-1 block text-lg font-bold text-[var(--student-text)]" : "mt-1 block text-lg font-semibold text-foreground"}>
                    {module.title}
                  </span>
                  {module.description ? (
                    <span className={student ? "mt-1 line-clamp-2 block text-sm leading-6 text-[var(--student-muted)]" : "mt-1 line-clamp-2 block text-sm leading-6 text-muted"}>
                      {module.description}
                    </span>
                  ) : null}
                  <span className={student ? "mt-2 block text-xs text-[var(--student-muted)]" : "mt-2 block text-xs text-muted"}>
                    {module.resources.length}{" "}
                    {module.resources.length === 1 ? "recurso" : "recursos"}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`mt-2 h-5 w-5 shrink-0 ${student ? "text-[var(--student-muted)]" : "text-muted"} transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <ModuleResourcePanel
                id={panelId}
                open={isOpen}
                className={student ? "border-t border-[var(--student-border)] bg-[color-mix(in_srgb,var(--student-bg)_62%,var(--student-panel))] p-4 sm:p-5" : "border-t border-border p-4 sm:p-5"}
              >
                  {module.resources.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {module.resources.map((resource) => (
                        <ResourcePresentation
                          key={resource.id}
                          resource={resource}
                          openPdfId={openPdfId}
                          onOpenPdf={setOpenPdfId}
                          onClosePdf={() => setOpenPdfId(null)}
                          student={student}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className={student ? "rounded-xl border border-dashed border-[var(--student-border)] p-4 text-sm text-[var(--student-muted)]" : "rounded-lg border border-dashed border-border p-4 text-sm text-muted"}>
                      Este módulo aún no tiene recursos publicados.
                    </p>
                  )}
              </ModuleResourcePanel>
            </article>
          );
        })}
      </div>
    </div>
  );
}

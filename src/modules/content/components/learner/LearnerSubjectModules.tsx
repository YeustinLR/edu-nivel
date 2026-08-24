"use client";

import { BookOpen, ChevronDown, ExternalLink, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ResourceType } from "@/generated/prisma/enums";
import {
  ResourceTypeBadge,
} from "@/modules/content/components/admin/ContentBadges";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import { PdfCanvasViewer } from "@/modules/content/components/shared/PdfCanvasViewer";
import { YouTubeEmbed } from "@/modules/content/components/shared/YouTubeEmbed";
import { ResourceContentRenderer } from "@/modules/content/components/editor/ResourceContentRenderer";

export type LearnerModuleResource = {
  id: string;
  title: string;
  instructions: string | null;
  content: string | null;
  estimatedMinutes: number | null;
  type: ResourceType;
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
  const surfaceClass = student
    ? "rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] p-5 shadow-[0_5px_22px_rgba(15,23,42,0.035)]"
    : "rounded-xl border border-border bg-background p-4";
  const titleClass = student
    ? "mt-3 font-bold text-[var(--student-text)]"
    : "mt-3 font-semibold text-foreground";
  const descriptionClass = student
    ? "mt-1 text-sm leading-6 text-[var(--student-muted)]"
    : "mt-1 text-sm text-muted";

  const header = (
    <>
      <ResourceTypeBadge type={resource.type} showIcon />
      <p className={titleClass}>{resource.title}</p>
    </>
  );
  const instructions = resource.instructions ? (
    <details className={student ? "mt-4 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/25" : "mt-4 rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/25"}>
      <summary className={student ? "flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-bold text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:text-amber-100" : "flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:text-amber-100"}>
        <Lightbulb aria-hidden="true" className="h-4 w-4" />
        Ver indicaciones
      </summary>
      <p className="border-t border-amber-200 px-3 py-3 whitespace-pre-wrap text-sm leading-6 text-amber-950 dark:border-amber-900/60 dark:text-amber-100">
        {resource.instructions}
      </p>
    </details>
  ) : null;
  const writtenContent = resource.content ? (
    <details className={student ? "mt-4 rounded-xl border border-[var(--student-border)] p-3" : "mt-4 rounded-lg border border-border p-3"}>
      <summary className={student ? "cursor-pointer text-sm font-bold text-[var(--student-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)]" : "cursor-pointer text-sm font-medium text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"}>
        Leer contenido
        {resource.estimatedMinutes
          ? ` · ${resource.estimatedMinutes} min`
          : ""}
      </summary>
      <ResourceContentRenderer
        content={resource.content}
        className={student ? "mt-3 text-[var(--student-text)]" : "mt-3"}
      />
    </details>
  ) : null;

  if (resource.type === ResourceType.NOTE) {
    return <div className={surfaceClass}>{header}{instructions}{writtenContent}</div>;
  }

  if (resource.type === ResourceType.PDF) {
    const isOpen = openPdfId === resource.id;

    return (
      <div
        className={`${surfaceClass} ${
          isOpen ? "md:col-span-2" : ""
        }`}
      >
        {header}
        {instructions}
        {writtenContent}

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

  if (resource.type === ResourceType.IMAGE || resource.type === ResourceType.FILE || resource.type === ResourceType.AUDIO) {
    return (
      <div className={surfaceClass}>
        {header}
        {instructions}
        {writtenContent}
        <Link href={`/api/resources/${resource.id}/file`} target="_blank" className={student ? "mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--student-border)] px-3 py-2 text-sm font-bold text-[var(--student-blue)] hover:bg-[var(--student-blue-soft)]" : "mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-elevated"}>
          {resource.type === ResourceType.IMAGE ? "Ver imagen" : "Abrir archivo"}
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (resource.type === ResourceType.YOUTUBE && resource.youtubeVideo) {
    return (
      <div className={`${surfaceClass} md:col-span-2`}>
        {header}
        {instructions}
        {writtenContent}
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
      <div className={surfaceClass}>
        {header}
        {instructions}
        {writtenContent}
        <a href={resource.linkResource.url} target={resource.linkResource.openInNewTab ? "_blank" : undefined} rel={resource.linkResource.openInNewTab ? "noreferrer" : undefined} className={student ? "mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--student-border)] px-3 py-2 text-sm font-bold text-[var(--student-blue)] hover:bg-[var(--student-blue-soft)]" : "mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-elevated"}>
          Abrir vínculo
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className={surfaceClass}>
      {header}
      {instructions}
      {writtenContent}
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

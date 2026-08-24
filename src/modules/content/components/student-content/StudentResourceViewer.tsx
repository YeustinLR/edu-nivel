import {
  ExternalLink,
  FileDown,
  FileText,
  Lightbulb,
  Timer,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ResourceType } from "@/generated/prisma/enums";
import {
  ResourceTypeBadge,
  resourceTypeLabels,
} from "@/modules/content/components/admin/ContentBadges";
import { ResourceContentRenderer } from "@/modules/content/components/editor/ResourceContentRenderer";
import { StudentResourceProgressControl } from "@/modules/content/components/student-content/StudentResourceProgressControl";
import { StudentSaveResourceButton } from "@/modules/content/components/student-content/StudentSaveResourceButton";
import { PdfCanvasViewer } from "@/modules/content/components/shared/PdfCanvasViewer";
import { YouTubeEmbed } from "@/modules/content/components/shared/YouTubeEmbed";
import type {
  StudentContentNavigationTarget,
  StudentContentResourceDetail,
} from "@/modules/content/types/student-content";
import { formatResourceDuration } from "@/modules/dashboard/domain/learner-presentation";

function formatSize(value: string | null) {
  if (!value) return null;
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return null;
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function ProtectedFileUnavailable() {
  return (
    <div className="rounded-control border border-dashed border-line bg-paper/60 p-5 text-sm leading-6 text-ink-500 dark:border-[var(--student-border)] dark:bg-[var(--student-bg)] dark:text-[var(--student-muted)]">
      Este archivo no está disponible para vista previa en este entorno.
    </div>
  );
}

function MissingSpecializedContent({ type }: { type: ResourceType }) {
  return (
    <div className="rounded-control border border-dashed border-line bg-paper/60 p-5 text-sm leading-6 text-ink-500 dark:border-[var(--student-border)] dark:bg-[var(--student-bg)] dark:text-[var(--student-muted)]">
      El recurso de tipo {resourceTypeLabels[type].toLocaleLowerCase("es-CR")} no
      tiene contenido compatible disponible.
    </div>
  );
}

function StoredFileCard({
  resource,
}: {
  resource: StudentContentResourceDetail;
}) {
  if (!resource.file) return <MissingSpecializedContent type={resource.type} />;
  if (!resource.protectedFileAccessEnabled) return <ProtectedFileUnavailable />;
  const size = formatSize(resource.file.sizeBytes);

  return (
    <div className="flex flex-col gap-4 rounded-[16px] border border-line bg-paper/60 p-5 dark:border-[var(--student-border)] dark:bg-[var(--student-bg)] sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-violet-100 text-violet dark:bg-violet/15 dark:text-[var(--student-blue)]">
        <FileText aria-hidden="true" className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900 dark:text-[var(--student-text)]">
          {resource.file.originalName}
        </p>
        <p className="mt-1 text-xs text-ink-500 dark:text-[var(--student-muted)]">
          {[resource.file.mimeType, size].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Link
        href={`/api/resources/${encodeURIComponent(resource.id)}/file`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-control bg-ink-900 px-4 text-sm font-bold text-white transition hover:bg-[#1f2b46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
      >
        <FileDown aria-hidden="true" className="size-4" />
        Abrir archivo
      </Link>
    </div>
  );
}

function SpecializedResource({
  resource,
}: {
  resource: StudentContentResourceDetail;
}) {
  switch (resource.type) {
    case ResourceType.NOTE:
      return resource.content ? null : (
        <MissingSpecializedContent type={resource.type} />
      );

    case ResourceType.YOUTUBE:
      return resource.youtube ? (
        <YouTubeEmbed
          videoId={resource.youtube.videoId}
          title={resource.title}
          startAt={resource.youtube.startAt}
          endAt={resource.youtube.endAt}
        />
      ) : (
        <MissingSpecializedContent type={resource.type} />
      );

    case ResourceType.PDF:
      if (!resource.pdf) return <MissingSpecializedContent type={resource.type} />;
      return resource.protectedFileAccessEnabled ? (
        <PdfCanvasViewer resourceId={resource.id} title={resource.title} />
      ) : (
        <ProtectedFileUnavailable />
      );

    case ResourceType.IMAGE:
      if (!resource.image) {
        return <MissingSpecializedContent type={resource.type} />;
      }
      if (!resource.protectedFileAccessEnabled) return <ProtectedFileUnavailable />;
      return (
        <figure className="overflow-hidden rounded-[16px] border border-line bg-paper/60 dark:border-[var(--student-border)] dark:bg-[var(--student-bg)]">
          <div className="flex min-h-64 items-center justify-center p-4">
            <Image
              src={`/api/resources/${encodeURIComponent(resource.id)}/file`}
              alt={resource.image.altText?.trim() || resource.title}
              width={
                resource.image.width && resource.image.width > 0
                  ? resource.image.width
                  : 1200
              }
              height={
                resource.image.height && resource.image.height > 0
                  ? resource.image.height
                  : 800
              }
              sizes="(max-width: 1080px) 100vw, 900px"
              unoptimized
              className="max-h-[38rem] w-auto max-w-full object-contain"
            />
          </div>
          {resource.image.caption ? (
            <figcaption className="border-t border-line px-4 py-3 text-xs leading-5 text-ink-500 dark:border-[var(--student-border)] dark:text-[var(--student-muted)]">
              {resource.image.caption}
            </figcaption>
          ) : null}
        </figure>
      );

    case ResourceType.LINK: {
      const url = resource.link ? safeExternalUrl(resource.link.url) : null;
      if (!url) return <MissingSpecializedContent type={resource.type} />;
      return (
        <div className="rounded-[16px] border border-violet/20 bg-violet-100 p-5 dark:bg-violet/15">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#563ab8] dark:text-[var(--student-blue)]">
            Recurso externo
          </p>
          <p className="mt-2 break-all text-sm text-ink-700 dark:text-[var(--student-muted)]">
            {new URL(url).hostname}
          </p>
          <a
            href={url}
            target={resource.link?.openInNewTab ? "_blank" : undefined}
            rel={resource.link?.openInNewTab ? "noopener noreferrer" : undefined}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-control bg-violet px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
          >
            Abrir vínculo
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </div>
      );
    }

    case ResourceType.FILE:
      return <StoredFileCard resource={resource} />;

    case ResourceType.AUDIO:
      if (!resource.audio) return <MissingSpecializedContent type={resource.type} />;
      if (!resource.protectedFileAccessEnabled) return <ProtectedFileUnavailable />;
      return (
        <div className="rounded-[16px] border border-line bg-paper/60 p-5 dark:border-[var(--student-border)] dark:bg-[var(--student-bg)]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-violet-100 text-violet dark:bg-violet/15 dark:text-[var(--student-blue)]">
              <Volume2 aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900 dark:text-[var(--student-text)]">
                {resource.audio.originalName}
              </p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-[var(--student-muted)]">
                {[resource.audio.mimeType, formatSize(resource.audio.sizeBytes)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <audio
            controls
            preload="metadata"
            src={`/api/resources/${encodeURIComponent(resource.id)}/file`}
            className="mt-4 w-full"
          >
            Tu navegador no puede reproducir este audio.
          </audio>
          {resource.audio.transcript ? (
            <details className="mt-4 rounded-control border border-line bg-surface p-3 dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]">
              <summary className="cursor-pointer text-sm font-bold text-violet dark:text-[var(--student-blue)]">
                Leer transcripción
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700 dark:text-[var(--student-muted)]">
                {resource.audio.transcript}
              </p>
            </details>
          ) : null}
        </div>
      );

    case ResourceType.QUIZ:
      return (
        <div className="rounded-control border border-dashed border-violet/30 bg-violet-100/60 p-5 text-sm leading-6 text-[#563ab8] dark:bg-violet/15 dark:text-[var(--student-blue)]">
          Este cuestionario está publicado, pero EduNivel todavía no dispone de
          un runner validado para responderlo de forma segura.
        </div>
      );

    case ResourceType.GAME:
      return (
        <div className="rounded-control border border-dashed border-violet/30 bg-violet-100/60 p-5 text-sm leading-6 text-[#563ab8] dark:bg-violet/15 dark:text-[var(--student-blue)]">
          Este juego está publicado, pero su tipo todavía no tiene un visor
          registrado en EduNivel.
        </div>
      );

    default: {
      const exhaustive: never = resource.type;
      return exhaustive;
    }
  }
}

export function StudentResourceViewer({
  resource,
  moduleTitle,
  previous,
  next,
  resourcePosition,
  resourceCount,
  moduleResourcePosition,
  moduleResourceCount,
  moduleResourceCompletion,
}: {
  resource: StudentContentResourceDetail;
  moduleTitle: string;
  previous: StudentContentNavigationTarget;
  next: StudentContentNavigationTarget;
  resourcePosition: number;
  resourceCount: number;
  moduleResourcePosition: number;
  moduleResourceCount: number;
  moduleResourceCompletion: boolean[];
}) {
  const duration = formatResourceDuration(
    resource.estimatedMinutes,
    resource.youtube?.duration ?? resource.audio?.duration ?? null,
  );

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]">
      <header className="border-b border-line px-5 py-5 dark:border-[var(--student-border)] sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-[var(--student-muted)]">
              <ResourceTypeBadge type={resource.type} showIcon />
              <span>{moduleTitle}</span>
              {resource.isRequired ? (
                <span className="rounded-md bg-gold-100 px-2 py-1 font-meta text-[10px] font-semibold uppercase text-[#8a6200] dark:bg-gold/15 dark:text-gold">
                  Requerido
                </span>
              ) : null}
            </div>
            <h1
              id="selected-resource-title"
              tabIndex={-1}
              className="mt-2 font-heading text-2xl font-bold tracking-[-0.025em] text-ink-900 outline-none dark:text-[var(--student-text)]"
            >
              {resource.title}
            </h1>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <StudentSaveResourceButton
              key={`${resource.id}:${resource.isSaved ? "saved" : "unsaved"}`}
              resourceId={resource.id}
              initialSaved={resource.isSaved}
            />
            <StudentResourceProgressControl
              key={`${resource.id}:${resource.isCompleted ? "completed" : "pending"}`}
              resourceId={resource.id}
              initialCompleted={resource.isCompleted}
            />
          </div>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 font-meta text-[11px] text-ink-500 dark:text-[var(--student-muted)]">
          {duration ? (
            <>
              <Timer aria-hidden="true" className="size-3.5" />
              <span>{duration}</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span>
            Recurso {resourcePosition} de {resourceCount}
          </span>
        </p>
      </header>

      <div className="space-y-5 px-5 py-6 text-[15px] leading-6 text-ink-700 dark:text-[var(--student-muted)] sm:px-7">
        {resource.instructions ? (
          <aside className="flex gap-3 rounded-[16px] border border-gold/25 bg-gold-100/70 p-4 text-[#775600] dark:bg-gold/10 dark:text-gold">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-gold text-ink-900">
              <Lightbulb aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-sm font-bold text-ink-900 dark:text-[var(--student-text)]">
                Indicaciones
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                {resource.instructions}
              </p>
            </div>
          </aside>
        ) : null}

        {resource.content ? (
          <ResourceContentRenderer
            content={resource.content}
            className="text-ink-700 dark:text-[var(--student-text)]"
          />
        ) : null}

        <SpecializedResource resource={resource} />
      </div>

      <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line px-5 py-4 dark:border-[var(--student-border)] sm:px-7">
        <div>
          {previous ? (
            <Link
              href={previous.href}
              scroll={false}
              className="inline-flex min-h-10 max-w-full items-center rounded-control border border-line px-3 text-sm font-semibold text-ink-700 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 dark:border-[var(--student-border)] dark:text-[var(--student-text)] dark:hover:bg-[var(--student-soft)]"
            >
              <span className="truncate">← {previous.title}</span>
            </Link>
          ) : null}
        </div>
        <div
          className="flex gap-1.5"
          role="list"
          aria-label={`Recurso ${moduleResourcePosition} de ${moduleResourceCount} en este módulo`}
        >
          {Array.from({ length: moduleResourceCount }, (_, index) => (
            <span
              key={index}
              role="listitem"
              aria-label={`Recurso ${index + 1}: ${
                moduleResourceCompletion[index] ? "completado" : "pendiente"
              }${index + 1 === moduleResourcePosition ? ", actual" : ""}`}
              className={`h-1.5 rounded-full transition-[width,background-color] ${
                moduleResourceCompletion[index]
                  ? `w-5 bg-mint ${
                      index + 1 === moduleResourcePosition
                        ? "ring-2 ring-gold/40 ring-offset-1"
                        : ""
                    }`
                  : index + 1 === moduleResourcePosition
                    ? "w-5 bg-gold"
                  : "w-1.5 bg-line dark:bg-[var(--student-border)]"
              }`}
            />
          ))}
        </div>
        <div className="text-right">
          {next ? (
            <Link
              href={next.href}
              scroll={false}
              className="inline-flex min-h-10 max-w-full items-center rounded-control bg-ink-900 px-4 text-sm font-bold text-white hover:bg-[#1f2b46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
            >
              <span className="truncate">{next.title} →</span>
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

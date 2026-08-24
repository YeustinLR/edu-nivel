import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Lightbulb,
  LinkIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ResourceType } from "@/generated/prisma/enums";
import {
  PublicationStatusBadge,
  ResourceTypeBadge,
} from "@/modules/content/components/admin/ContentBadges";
import { ContextualActionBar } from "@/modules/content/components/admin/ContextualActionBar";
import { PdfViewerLauncher } from "@/modules/content/components/shared/PdfCanvasViewer";
import { YouTubeEmbed } from "@/modules/content/components/shared/YouTubeEmbed";
import type { ResourceContentDetail } from "@/server/content/content-detail-queries";
import { ResourceContentRenderer } from "@/modules/content/components/editor/ResourceContentRenderer";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="break-words text-right text-xs text-foreground">
        {children}
      </dd>
    </div>
  );
}

function formatSize(value: string | null) {
  if (!value) return "No registrado";
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "No registrado";
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
    <p className="rounded-lg border border-dashed border-border p-4 text-sm leading-6 text-muted">
      El archivo no está disponible para vista previa en este entorno.
    </p>
  );
}

function WrittenContent({ resource }: { resource: ResourceContentDetail }) {
  if (!resource.content && !resource.estimatedMinutes) return null;

  return (
    <div className="space-y-2">
      {resource.estimatedMinutes ? (
        <p className="text-xs text-muted">
          {resource.estimatedMinutes} minutos estimados
        </p>
      ) : null}
      {resource.content ? (
        <ResourceContentRenderer content={resource.content} />
      ) : null}
    </div>
  );
}

function SpecializedContent({ resource }: { resource: ResourceContentDetail }) {
  if (resource.type === ResourceType.NOTE) return null;

  if (resource.youtube) {
    return (
      <YouTubeEmbed
        videoId={resource.youtube.videoId}
        title={resource.title}
        startAt={resource.youtube.startAt}
        endAt={resource.youtube.endAt}
      />
    );
  }

  if (resource.link) {
    const url = safeExternalUrl(resource.link.url);

    return url ? (
      <a
        href={url}
        target={resource.link.openInNewTab ? "_blank" : undefined}
        rel={resource.link.openInNewTab ? "noreferrer" : undefined}
        className="inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-secondary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        <LinkIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
        {new URL(url).hostname}
        {resource.link.openInNewTab ? (
          <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
        ) : null}
      </a>
    ) : (
      <p className="text-sm text-muted">El enlace no es válido.</p>
    );
  }

  if (resource.image) {
    if (!resource.protectedFileAccessEnabled) {
      return <ProtectedFileUnavailable />;
    }

    return (
      <figure className="overflow-hidden rounded-lg border border-border bg-surface-elevated/40">
        <div className="flex min-h-56 items-center justify-center p-3">
          <Image
            src={`/api/resources/${resource.id}/file`}
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
            sizes="(max-width: 768px) 100vw, 640px"
            unoptimized
            className="max-h-[28rem] w-auto max-w-full object-contain"
          />
        </div>
        {resource.image.caption ? (
          <figcaption className="border-t border-border px-3 py-2 text-xs text-muted">
            {resource.image.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (resource.pdf) {
    if (!resource.protectedFileAccessEnabled) {
      return <ProtectedFileUnavailable />;
    }

    return <PdfViewerLauncher resourceId={resource.id} title={resource.title} />;
  }

  const stored = resource.file ?? resource.audio;
  if (stored) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border p-4">
        <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-muted" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {stored.originalName}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Este tipo de archivo todavía no dispone de apertura protegida.
          </p>
        </div>
      </div>
    );
  }

  if (resource.quiz) {
    return (
      <dl className="border-y border-border">
        <DetailRow label="Puntaje mínimo">
          {resource.quiz.passingScore}%
        </DetailRow>
        <DetailRow label="Intentos">
          {resource.quiz.maxAttempts ?? "Sin límite"}
        </DetailRow>
        <DetailRow label="Orden aleatorio">
          {resource.quiz.shuffleQuestions ? "Sí" : "No"}
        </DetailRow>
      </dl>
    );
  }

  if (resource.game) {
    return (
      <p className="text-sm text-foreground-secondary">
        Tipo de juego: {resource.game.gameType}
      </p>
    );
  }

  return (
    <p className="text-sm text-muted">
      Este recurso no tiene contenido disponible para mostrar.
    </p>
  );
}

function TechnicalDetails({
  resource,
}: {
  resource: ResourceContentDetail;
}) {
  const stored = resource.pdf ?? resource.image ?? resource.file ?? resource.audio;
  if (!stored) return null;

  return (
    <details className="border-t border-border pt-4">
      <summary className="cursor-pointer text-xs font-medium text-muted hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
        Detalles del archivo
      </summary>
      <dl className="mt-2 max-w-md">
        <DetailRow label="Nombre">{stored.originalName}</DetailRow>
        <DetailRow label="Formato">{stored.mimeType}</DetailRow>
        <DetailRow label="Tamaño">{formatSize(stored.sizeBytes)}</DetailRow>
        {resource.image ? (
          <DetailRow label="Texto alternativo">
            {resource.image.altText ?? "No definido"}
          </DetailRow>
        ) : null}
        {resource.pdf ? (
          <DetailRow label="Páginas">
            {resource.pdf.pageCount ?? "No registrado"}
          </DetailRow>
        ) : null}
      </dl>
    </details>
  );
}

export function ResourceContentView({
  resource,
  backHref,
  editHref,
}: {
  resource: ResourceContentDetail;
  backHref?: string;
  editHref?: string;
}) {
  return (
    <article className="space-y-5">
      {backHref ? (
        <nav aria-label="Navegación del recurso">
          <Link
            href={backHref}
            scroll={false}
            className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-sm font-medium text-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Volver a recursos
          </Link>
        </nav>
      ) : null}

      <header>
        <ContextualActionBar
          secondaryAction={
            editHref && resource.canEdit
              ? { label: "Administrar recurso", href: editHref }
              : undefined
          }
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ResourceTypeBadge type={resource.type} />
              <PublicationStatusBadge status={resource.publicationStatus} />
            </div>
            <h3 className="mt-3 break-words text-lg font-semibold text-foreground">
              {resource.title}
            </h3>
            <p className="mt-1 text-xs text-muted">Por {resource.authorName}</p>
          </div>
        </ContextualActionBar>
      </header>

      {resource.instructions ? (
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb aria-hidden="true" className="h-4 w-4" />
            Indicaciones para el estudiante
          </h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {resource.instructions}
          </p>
        </aside>
      ) : null}

      <section aria-label="Vista previa del recurso" className="space-y-5">
        <WrittenContent resource={resource} />
        <SpecializedContent resource={resource} />
        {!resource.content && resource.type === ResourceType.NOTE ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm leading-6 text-muted">
            Este recurso todavía no tiene contenido escrito.
          </p>
        ) : null}
      </section>

      <TechnicalDetails resource={resource} />

    </article>
  );
}

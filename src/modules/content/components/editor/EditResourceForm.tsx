"use client";

import { Clock3, FileText, ImageIcon, Paperclip } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";

import { ResourceType } from "@/generated/prisma/enums";
import { updateResourceContentAction } from "@/modules/content/actions/content-edit-actions";
import {
  adminResourceAttachments,
  ResourceAttachmentChoices,
} from "@/modules/content/components/creation/ResourceAttachmentChoices";
import {
  EditActionFeedback,
  EditFieldError,
  EditFormActions,
  editorFieldClass,
} from "@/modules/content/components/editor/ContentEditForm";
import { ResourceDocumentField } from "@/modules/content/components/editor/ResourceDocumentField";
import { getResourceContentValidationMessage } from "@/modules/content/domain/resource-document";
import type { ResourceAttachmentKind } from "@/modules/content/domain/resource-attachment";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

type ExistingFile = {
  originalName: string;
  mimeType: string;
  sizeBytes: string | null;
};

function getExistingAttachment(type: ResourceType): ResourceAttachmentKind | null {
  if (type === ResourceType.YOUTUBE) return "YOUTUBE";
  if (type === ResourceType.LINK) return "LINK";
  if (
    type === ResourceType.PDF ||
    type === ResourceType.IMAGE ||
    type === ResourceType.FILE ||
    type === ResourceType.AUDIO
  ) {
    return "UPLOAD";
  }
  return null;
}

export function EditResourceForm({
  resource,
  closeHref,
  onCancel,
  onSuccess,
}: {
  resource: {
    id: string;
    moduleId: string;
    type: ResourceType;
    title: string;
    instructions: string | null;
    content: string | null;
    estimatedMinutes: number | null;
    updatedAt: string;
    youtube: { videoId: string; startAt: number | null } | null;
    link: { url: string; openInNewTab: boolean } | null;
    pdf?: ExistingFile | null;
    file?: ExistingFile | null;
    audio?: ExistingFile | null;
    image: (ExistingFile & { altText: string | null }) | null;
  };
  closeHref?: string;
  onCancel?: () => void;
  onSuccess?: (message: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateResourceContentAction,
    initialContentEditActionState,
  );
  const titleErrorId = useId();
  const instructionsErrorId = useId();
  const contentErrorId = useId();
  const durationErrorId = useId();
  const videoIdErrorId = useId();
  const startAtErrorId = useId();
  const urlErrorId = useId();
  const altTextErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const [content, setContent] = useState(() =>
    String(values?.content ?? resource.content ?? ""),
  );
  const [contentValidationError, setContentValidationError] = useState<string | null>(() =>
    getResourceContentValidationMessage(String(values?.content ?? resource.content ?? "")),
  );
  const selectedAttachment = getExistingAttachment(resource.type);
  const existingFile = resource.pdf ?? resource.image ?? resource.file ?? resource.audio;

  useEffect(() => {
    if (state.status === "success") onSuccess?.(state.message);
  }, [onSuccess, state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={resource.id} />
      <input type="hidden" name="resourceType" value={resource.type} />
      <input type="hidden" name="expectedUpdatedAt" value={resource.updatedAt} />
      <EditActionFeedback state={state} />

      <section aria-labelledby="resource-basic-heading" className="space-y-4">
        <div>
          <h2 id="resource-basic-heading" className="font-semibold text-foreground">
            Información básica
          </h2>
          <p className="mt-1 text-sm text-muted">
            Identifica el recurso antes de revisar el contenido adjunto.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Título
            <input
              name="title"
              type="text"
              minLength={2}
              maxLength={160}
              required
              autoFocus
              disabled={isPending}
              defaultValue={String(values?.title ?? resource.title)}
              aria-invalid={Boolean(errors?.title)}
              aria-describedby={titleErrorId}
              className={editorFieldClass}
            />
            <EditFieldError id={titleErrorId} messages={errors?.title} />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Indicaciones para el estudiante{" "}
            <span className="font-normal text-muted">(opcional)</span>
            <input
              name="instructions"
              type="text"
              maxLength={1_000}
              disabled={isPending}
              defaultValue={String(values?.instructions ?? resource.instructions ?? "")}
              placeholder="Escribe una instrucción breve para que el estudiante sepa qué hacer."
              aria-invalid={Boolean(errors?.instructions)}
              aria-describedby={instructionsErrorId}
              className={editorFieldClass}
            />
            <span className="block text-xs font-normal leading-5 text-muted">
              Explica brevemente qué debe hacer o en qué debe prestar atención.
            </span>
            <EditFieldError id={instructionsErrorId} messages={errors?.instructions} />
          </label>
        </div>

        <div className="space-y-1.5 text-sm font-medium text-foreground">
          <div>
            Contenido
            {resource.content === null ? (
              <span className="font-normal text-muted"> (opcional)</span>
            ) : null}
          </div>
          <textarea name="content" value={content} readOnly hidden />
          <ResourceDocumentField
            initialValue={content}
            imageUploadContext={{
              editorSessionId: resource.id,
              resourceId: resource.id,
            }}
            disabled={isPending}
            invalid={Boolean(errors?.content) || Boolean(contentValidationError)}
            describedBy={contentErrorId}
            onChange={(serialized, error) => {
              setContent(serialized);
              setContentValidationError(error);
            }}
          />
          <EditFieldError
            id={contentErrorId}
            messages={errors?.content ?? (contentValidationError ? [contentValidationError] : undefined)}
          />
        </div>

        <label className="block text-sm font-medium text-foreground">
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-secondary" />
            Tiempo estimado
            <span className="font-normal text-muted">(opcional)</span>
          </span>
          <span className="mt-1.5 flex w-fit items-center rounded-lg border border-border bg-background focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
            <input
              name="estimatedMinutes"
              type="number"
              min={1}
              max={10_000}
              step={1}
              disabled={isPending}
              defaultValue={String(values?.estimatedMinutes ?? resource.estimatedMinutes ?? "")}
              aria-label="Duración estimada"
              aria-invalid={Boolean(errors?.estimatedMinutes)}
              aria-describedby={durationErrorId}
              placeholder="45"
              className="h-10 w-20 bg-transparent px-3 text-center text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="border-l border-border px-3 text-sm text-muted">min</span>
          </span>
          <span className="mt-1 block text-xs font-normal text-muted">
            Indica los minutos aproximados, por ejemplo 45.
          </span>
          <EditFieldError id={durationErrorId} messages={errors?.estimatedMinutes} />
        </label>
      </section>

      <section aria-labelledby="resource-attachment-heading">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Paperclip aria-hidden="true" className="h-4 w-4 text-secondary" />
          <h2 id="resource-attachment-heading">
            Adjuntar <span className="font-normal text-muted">(opcional)</span>
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          El adjunto actual se conserva. En edición puedes actualizar sus datos, pero no sustituir el archivo o cambiar su tipo.
        </p>
        <ResourceAttachmentChoices
          attachments={adminResourceAttachments}
          selected={selectedAttachment}
          disabled
        />
      </section>

      {resource.type === ResourceType.YOUTUBE && resource.youtube ? (
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            URL de YouTube
            <input
              name="videoId"
              type="text"
              maxLength={2_048}
              required
              disabled={isPending}
              defaultValue={String(values?.videoId ?? `https://www.youtube.com/watch?v=${resource.youtube.videoId}`)}
              placeholder="https://youtube.com/watch?v=…"
              aria-invalid={Boolean(errors?.videoId)}
              aria-describedby={videoIdErrorId}
              className={editorFieldClass}
            />
            <EditFieldError id={videoIdErrorId} messages={errors?.videoId} />
          </label>

          <label className="block max-w-xs space-y-1.5 text-sm font-medium text-foreground">
            Iniciar en el segundo <span className="font-normal text-muted">(opcional)</span>
            <input
              name="startAt"
              type="number"
              min={0}
              max={86_400}
              step={1}
              disabled={isPending}
              defaultValue={String(values?.startAt ?? resource.youtube.startAt ?? "")}
              aria-invalid={Boolean(errors?.startAt)}
              aria-describedby={startAtErrorId}
              className={editorFieldClass}
            />
            <EditFieldError id={startAtErrorId} messages={errors?.startAt} />
          </label>
        </div>
      ) : null}

      {resource.type === ResourceType.LINK && resource.link ? (
        <div className="space-y-3">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            URL
            <input
              name="url"
              type="url"
              maxLength={2_048}
              required
              disabled={isPending}
              defaultValue={String(values?.url ?? resource.link.url)}
              placeholder="https://ejemplo.com/recurso"
              aria-invalid={Boolean(errors?.url)}
              aria-describedby={urlErrorId}
              className={editorFieldClass}
            />
            <EditFieldError id={urlErrorId} messages={errors?.url} />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 text-sm text-foreground">
            <input
              name="openInNewTab"
              type="checkbox"
              defaultChecked={typeof values?.openInNewTab === "boolean" ? values.openInNewTab : resource.link.openInNewTab}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 accent-secondary"
            />
            <span>
              <span className="block font-medium">Abrir en una pestaña nueva</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">
                Evita interrumpir la navegación actual en EduNivel.
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {selectedAttachment === "UPLOAD" && existingFile ? (
        <div className="flex items-start gap-3 rounded-xl border border-secondary/30 bg-secondary/5 p-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            {resource.type === ResourceType.IMAGE ? (
              <ImageIcon aria-hidden="true" className="h-5 w-5" />
            ) : (
              <FileText aria-hidden="true" className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{existingFile.originalName}</p>
            <p className="mt-1 text-xs text-muted">{existingFile.mimeType} · Adjunto actual</p>
          </div>
        </div>
      ) : null}

      {resource.type === ResourceType.IMAGE && resource.image ? (
        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          Texto alternativo
          <textarea
            name="altText"
            rows={3}
            maxLength={300}
            disabled={isPending}
            defaultValue={String(values?.altText ?? resource.image.altText ?? "")}
            aria-invalid={Boolean(errors?.altText)}
            aria-describedby={altTextErrorId}
            className={`${editorFieldClass} resize-y`}
          />
          <EditFieldError id={altTextErrorId} messages={errors?.altText} />
        </label>
      ) : null}

      <EditFormActions
        closeHref={closeHref}
        onCancel={onCancel}
        isPending={isPending}
        submitDisabled={Boolean(contentValidationError)}
      />
    </form>
  );
}

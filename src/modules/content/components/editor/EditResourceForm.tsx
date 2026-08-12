"use client";

import { useActionState, useId } from "react";

import { ResourceType } from "@/generated/prisma/enums";
import { updateResourceContentAction } from "@/modules/content/actions/content-edit-actions";
import {
  EditActionFeedback,
  EditFieldError,
  EditFormActions,
  editorFieldClass,
} from "@/modules/content/components/editor/ContentEditForm";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

export function EditResourceForm({
  resource,
  closeHref,
}: {
  resource: {
    id: string;
    type: ResourceType;
    title: string;
    description: string | null;
    updatedAt: string;
    lesson: { content: string; estimatedMinutes: number | null } | null;
    didactic: { content: string; objective: string | null } | null;
    youtube: { videoId: string; startAt: number | null } | null;
    link: { url: string; openInNewTab: boolean } | null;
    image: { altText: string | null } | null;
  };
  closeHref?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateResourceContentAction,
    initialContentEditActionState,
  );
  const titleErrorId = useId();
  const descriptionErrorId = useId();
  const contentErrorId = useId();
  const durationErrorId = useId();
  const objectiveErrorId = useId();
  const videoIdErrorId = useId();
  const startAtErrorId = useId();
  const urlErrorId = useId();
  const altTextErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={resource.id} />
      <input type="hidden" name="resourceType" value={resource.type} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={resource.updatedAt}
      />
      <EditActionFeedback state={state} />

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Título del recurso
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
        Descripción <span className="font-normal text-muted">(opcional)</span>
        <textarea
          name="description"
          rows={4}
          maxLength={1_000}
          disabled={isPending}
          defaultValue={String(
            values?.description ?? resource.description ?? "",
          )}
          aria-invalid={Boolean(errors?.description)}
          aria-describedby={descriptionErrorId}
          className={`${editorFieldClass} resize-y`}
        />
        <EditFieldError id={descriptionErrorId} messages={errors?.description} />
      </label>

      {resource.type === ResourceType.LESSON && resource.lesson ? (
        <>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Contenido de la lección
            <textarea
              name="content"
              rows={12}
              maxLength={50_000}
              required
              disabled={isPending}
              defaultValue={String(
                values?.content ?? resource.lesson.content,
              )}
              aria-invalid={Boolean(errors?.content)}
              aria-describedby={contentErrorId}
              className={`${editorFieldClass} resize-y`}
            />
            <EditFieldError id={contentErrorId} messages={errors?.content} />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Duración estimada en minutos{" "}
            <span className="font-normal text-muted">(opcional)</span>
            <input
              name="estimatedMinutes"
              type="number"
              min={1}
              max={10_000}
              step={1}
              disabled={isPending}
              defaultValue={String(
                values?.estimatedMinutes ??
                  resource.lesson.estimatedMinutes ??
                  "",
              )}
              aria-invalid={Boolean(errors?.estimatedMinutes)}
              aria-describedby={durationErrorId}
              className={editorFieldClass}
            />
            <EditFieldError
              id={durationErrorId}
              messages={errors?.estimatedMinutes}
            />
          </label>
        </>
      ) : null}

      {resource.type === ResourceType.DIDACTIC && resource.didactic ? (
        <>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Objetivo pedagógico{" "}
            <span className="font-normal text-muted">(opcional)</span>
            <textarea
              name="objective"
              rows={3}
              maxLength={500}
              disabled={isPending}
              defaultValue={String(
                values?.objective ?? resource.didactic.objective ?? "",
              )}
              aria-invalid={Boolean(errors?.objective)}
              aria-describedby={objectiveErrorId}
              className={`${editorFieldClass} resize-y`}
            />
            <EditFieldError
              id={objectiveErrorId}
              messages={errors?.objective}
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Contenido didáctico
            <textarea
              name="content"
              rows={12}
              maxLength={50_000}
              required
              disabled={isPending}
              defaultValue={String(
                values?.content ?? resource.didactic.content,
              )}
              aria-invalid={Boolean(errors?.content)}
              aria-describedby={contentErrorId}
              className={`${editorFieldClass} resize-y`}
            />
            <EditFieldError id={contentErrorId} messages={errors?.content} />
          </label>
        </>
      ) : null}

      {resource.type === ResourceType.YOUTUBE && resource.youtube ? (
        <>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            URL o identificador de YouTube
            <input
              name="videoId"
              type="text"
              maxLength={2_048}
              required
              disabled={isPending}
              defaultValue={String(
                values?.videoId ??
                  `https://www.youtube.com/watch?v=${resource.youtube.videoId}`,
              )}
              aria-invalid={Boolean(errors?.videoId)}
              aria-describedby={videoIdErrorId}
              className={editorFieldClass}
            />
            <EditFieldError id={videoIdErrorId} messages={errors?.videoId} />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Iniciar en el segundo{" "}
            <span className="font-normal text-muted">(opcional)</span>
            <input
              name="startAt"
              type="number"
              min={0}
              max={86_400}
              step={1}
              disabled={isPending}
              defaultValue={String(
                values?.startAt ?? resource.youtube.startAt ?? "",
              )}
              aria-invalid={Boolean(errors?.startAt)}
              aria-describedby={startAtErrorId}
              className={editorFieldClass}
            />
            <EditFieldError id={startAtErrorId} messages={errors?.startAt} />
          </label>
        </>
      ) : null}

      {resource.type === ResourceType.LINK && resource.link ? (
        <>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            URL del enlace
            <input
              name="url"
              type="url"
              maxLength={2_048}
              required
              disabled={isPending}
              defaultValue={String(values?.url ?? resource.link.url)}
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
              defaultChecked={
                typeof values?.openInNewTab === "boolean"
                  ? values.openInNewTab
                  : resource.link.openInNewTab
              }
              disabled={isPending}
              className="mt-0.5 h-4 w-4 accent-secondary"
            />
            <span>
              <span className="block font-medium">
                Abrir en una pestaña nueva
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">
                Evita interrumpir la navegación actual en EduNivel.
              </span>
            </span>
          </label>
        </>
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

      {resource.type !== ResourceType.LESSON &&
      resource.type !== ResourceType.DIDACTIC &&
      resource.type !== ResourceType.YOUTUBE &&
      resource.type !== ResourceType.LINK &&
      resource.type !== ResourceType.IMAGE ? (
        <p className="rounded-lg border border-border bg-background p-3 text-xs leading-5 text-muted">
          Este tipo permite modificar únicamente el título y la descripción por
          ahora.
        </p>
      ) : null}

      <EditFormActions closeHref={closeHref} isPending={isPending} />
    </form>
  );
}

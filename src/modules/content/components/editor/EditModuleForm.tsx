"use client";

import { useActionState, useId } from "react";

import { updateModuleContentAction } from "@/modules/content/actions/content-edit-actions";
import {
  EditActionFeedback,
  EditFieldError,
  EditFormActions,
  editorFieldClass,
} from "@/modules/content/components/editor/ContentEditForm";
import {
  contentAudienceValues,
  type ContentAudienceValue,
} from "@/modules/content/domain/content-audience";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

const audienceLabels = {
  STUDENT: "Estudiantes",
  TEACHER: "Docentes",
  BOTH: "Estudiantes y docentes",
} satisfies Record<ContentAudienceValue, string>;

export function EditModuleForm({
  moduleRecord,
  closeHref,
}: {
  moduleRecord: {
    id: string;
    title: string;
    description: string | null;
    audience: ContentAudienceValue;
    updatedAt: string;
  };
  closeHref?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateModuleContentAction,
    initialContentEditActionState,
  );
  const titleErrorId = useId();
  const descriptionErrorId = useId();
  const audienceErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={moduleRecord.id} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={moduleRecord.updatedAt}
      />
      <EditActionFeedback state={state} />

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Título del módulo
        <input
          name="title"
          type="text"
          minLength={2}
          maxLength={160}
          required
          autoFocus
          disabled={isPending}
          defaultValue={String(values?.title ?? moduleRecord.title)}
          aria-invalid={Boolean(errors?.title)}
          aria-describedby={titleErrorId}
          className={editorFieldClass}
        />
        <EditFieldError id={titleErrorId} messages={errors?.title} />
      </label>

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Audiencia
        <select
          name="audience"
          required
          disabled={isPending}
          defaultValue={String(values?.audience ?? moduleRecord.audience)}
          aria-invalid={Boolean(errors?.audience)}
          aria-describedby={audienceErrorId}
          className={editorFieldClass}
        >
          {contentAudienceValues.map((audience) => (
            <option key={audience} value={audience}>
              {audienceLabels[audience]}
            </option>
          ))}
        </select>
        <EditFieldError id={audienceErrorId} messages={errors?.audience} />
      </label>

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Descripción <span className="font-normal text-muted">(opcional)</span>
        <textarea
          name="description"
          rows={5}
          maxLength={1_000}
          disabled={isPending}
          defaultValue={String(
            values?.description ?? moduleRecord.description ?? "",
          )}
          aria-invalid={Boolean(errors?.description)}
          aria-describedby={descriptionErrorId}
          className={`${editorFieldClass} resize-y`}
        />
        <EditFieldError id={descriptionErrorId} messages={errors?.description} />
      </label>

      <EditFormActions closeHref={closeHref} isPending={isPending} />
    </form>
  );
}

"use client";

import { useActionState, useId } from "react";

import { updateSubjectContentAction } from "@/modules/content/actions/content-edit-actions";
import {
  EditActionFeedback,
  EditFieldError,
  EditFormActions,
  editorFieldClass,
} from "@/modules/content/components/editor/ContentEditForm";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

export function EditSubjectForm({
  subject,
  closeHref,
}: {
  subject: {
    id: string;
    name: string;
    description: string | null;
    updatedAt: string;
  };
  closeHref?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSubjectContentAction,
    initialContentEditActionState,
  );
  const nameErrorId = useId();
  const descriptionErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={subject.id} />
      <input type="hidden" name="expectedUpdatedAt" value={subject.updatedAt} />
      <EditActionFeedback state={state} />

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Nombre de la materia
        <input
          name="name"
          type="text"
          minLength={2}
          maxLength={120}
          required
          autoFocus
          disabled={isPending}
          defaultValue={String(values?.name ?? subject.name)}
          aria-invalid={Boolean(errors?.name)}
          aria-describedby={nameErrorId}
          className={editorFieldClass}
        />
        <EditFieldError id={nameErrorId} messages={errors?.name} />
      </label>

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Descripción <span className="font-normal text-muted">(opcional)</span>
        <textarea
          name="description"
          rows={4}
          maxLength={500}
          disabled={isPending}
          defaultValue={String(values?.description ?? subject.description ?? "")}
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

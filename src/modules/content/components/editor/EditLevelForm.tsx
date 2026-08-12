"use client";

import { useActionState, useId } from "react";

import { updateLevelContentAction } from "@/modules/content/actions/content-edit-actions";
import {
  EditActionFeedback,
  EditFieldError,
  EditFormActions,
  editorFieldClass,
} from "@/modules/content/components/editor/ContentEditForm";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

export function EditLevelForm({
  level,
  closeHref,
}: {
  level: {
    id: string;
    levelNumber: number;
    description: string | null;
    requiresSubscription: boolean;
    updatedAt: string;
  };
  closeHref?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateLevelContentAction,
    initialContentEditActionState,
  );
  const levelNumberErrorId = useId();
  const descriptionErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={level.id} />
      <input type="hidden" name="expectedUpdatedAt" value={level.updatedAt} />
      <EditActionFeedback state={state} />

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Número de nivel
        <input
          name="levelNumber"
          type="number"
          min={1}
          step={1}
          required
          autoFocus
          disabled={isPending}
          defaultValue={String(values?.levelNumber ?? level.levelNumber)}
          aria-invalid={Boolean(errors?.levelNumber)}
          aria-describedby={levelNumberErrorId}
          className={editorFieldClass}
        />
        <EditFieldError id={levelNumberErrorId} messages={errors?.levelNumber} />
      </label>

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Descripción <span className="font-normal text-muted">(opcional)</span>
        <textarea
          name="description"
          rows={4}
          maxLength={500}
          disabled={isPending}
          defaultValue={String(values?.description ?? level.description ?? "")}
          aria-invalid={Boolean(errors?.description)}
          aria-describedby={descriptionErrorId}
          className={`${editorFieldClass} resize-y`}
        />
        <EditFieldError id={descriptionErrorId} messages={errors?.description} />
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
        <input
          name="requiresSubscription"
          type="checkbox"
          defaultChecked={
            typeof values?.requiresSubscription === "boolean"
              ? values.requiresSubscription
              : level.requiresSubscription
          }
          disabled={isPending}
          className="mt-0.5 h-4 w-4 accent-secondary"
        />
        <span>
          <span className="block font-medium">Requiere suscripción</span>
          <span className="mt-0.5 block text-xs leading-5 text-muted">
            Controla el acceso de estudiantes y docentes al nivel.
          </span>
        </span>
      </label>

      <EditFormActions closeHref={closeHref} isPending={isPending} />
    </form>
  );
}

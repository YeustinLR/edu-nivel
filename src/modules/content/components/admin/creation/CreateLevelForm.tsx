"use client";

import { Layers3 } from "lucide-react";
import { useActionState, useId } from "react";

import { createAdminLevelAction } from "@/modules/content/actions/admin-content-creation-actions";
import { ContentPanelSection } from "@/modules/content/components/admin/ContentPanelPrimitives";
import {
  CreationActionFeedback,
  CreationFieldError,
  CreationFormActions,
  creationFieldClass,
} from "@/modules/content/components/admin/creation/ContentCreationForm";
import { initialContentCreationActionState } from "@/modules/content/types/content-creation-action-state";

export function CreateLevelForm({ closeHref }: { closeHref: string }) {
  const [state, formAction, isPending] = useActionState(
    createAdminLevelAction,
    initialContentCreationActionState,
  );
  const numberErrorId = useId();
  const descriptionErrorId = useId();
  const values = state.status === "error" ? state.values : undefined;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  if (state.status === "success") {
    return <CreationActionFeedback state={state} />;
  }

  return (
    <form action={formAction} className="space-y-5">
      <CreationActionFeedback state={state} />

      <ContentPanelSection
        icon={Layers3}
        title="Información del nivel"
        description="Define cómo se identificará este nivel dentro del catálogo."
      >
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Número de nivel
            <input
              name="levelNumber"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              autoFocus
              defaultValue={values?.levelNumber}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors?.levelNumber)}
              aria-describedby={numberErrorId}
              className={`${creationFieldClass} max-w-32`}
            />
            <CreationFieldError
              id={numberErrorId}
              messages={fieldErrors?.levelNumber}
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Descripción <span className="font-normal text-muted">(opcional)</span>
            <textarea
              name="description"
              rows={4}
              maxLength={500}
              defaultValue={values?.description}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors?.description)}
              aria-describedby={descriptionErrorId}
              className={`${creationFieldClass} resize-y`}
            />
            <CreationFieldError
              id={descriptionErrorId}
              messages={fieldErrors?.description}
            />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 text-sm text-foreground transition hover:border-secondary/40">
            <input
              name="requiresSubscription"
              type="checkbox"
              defaultChecked={values?.requiresSubscription ?? true}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 accent-secondary"
            />
            <span>
              <span className="block font-medium">Requiere suscripción</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">
                El acceso a este nivel dependerá de una suscripción válida.
              </span>
            </span>
          </label>
        </div>
      </ContentPanelSection>

      <CreationFormActions
        closeHref={closeHref}
        isPending={isPending}
        submitLabel="Crear nivel"
      />
    </form>
  );
}

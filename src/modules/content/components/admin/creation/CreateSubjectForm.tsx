"use client";

import { BookOpen } from "lucide-react";
import { useActionState, useId } from "react";

import { createAdminSubjectAction } from "@/modules/content/actions/admin-content-creation-actions";
import { ContentPanelSection } from "@/modules/content/components/admin/ContentPanelPrimitives";
import {
  CreationActionFeedback,
  CreationFieldError,
  CreationFormActions,
  creationFieldClass,
} from "@/modules/content/components/admin/creation/ContentCreationForm";
import { initialContentCreationActionState } from "@/modules/content/types/content-creation-action-state";

export function CreateSubjectForm({
  levelId,
  closeHref,
}: {
  levelId: string;
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createAdminSubjectAction,
    initialContentCreationActionState,
  );
  const nameErrorId = useId();
  const descriptionErrorId = useId();
  const levelErrorId = useId();
  const values = state.status === "error" ? state.values : undefined;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  if (state.status === "success") {
    return <CreationActionFeedback state={state} />;
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="levelId" value={levelId} />
      <CreationActionFeedback state={state} />

      {fieldErrors?.levelId ? (
        <CreationFieldError
          id={levelErrorId}
          messages={fieldErrors?.levelId}
        />
      ) : null}

      <ContentPanelSection
        icon={BookOpen}
        title="Información de la materia"
        description="Usa un nombre claro y reconocible para docentes y estudiantes."
      >
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Nombre de la materia
            <input
              name="name"
              type="text"
              minLength={2}
              maxLength={120}
              required
              autoFocus
              defaultValue={values?.name}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors?.name)}
              aria-describedby={nameErrorId}
              className={creationFieldClass}
            />
            <CreationFieldError id={nameErrorId} messages={fieldErrors?.name} />
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
        </div>
      </ContentPanelSection>

      <CreationFormActions
        closeHref={closeHref}
        isPending={isPending}
        submitLabel="Crear materia"
      />
    </form>
  );
}

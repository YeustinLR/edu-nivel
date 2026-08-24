"use client";

import {
  GraduationCap,
  Library,
  Presentation,
  UsersRound,
} from "lucide-react";
import { useActionState, useEffect, useId } from "react";

import { createAdminModuleAction } from "@/modules/content/actions/admin-content-creation-actions";
import { ContentPanelSection } from "@/modules/content/components/admin/ContentPanelPrimitives";
import {
  CreationActionFeedback,
  CreationFieldError,
  CreationFormActions,
  creationFieldClass,
} from "@/modules/content/components/admin/creation/ContentCreationForm";
import {
  contentAudienceValues,
  type ContentAudienceValue,
} from "@/modules/content/domain/content-audience";
import { initialContentCreationActionState } from "@/modules/content/types/content-creation-action-state";

const audienceLabels = {
  STUDENT: "Estudiantes",
  TEACHER: "Docentes",
  BOTH: "Estudiantes y docentes",
} satisfies Record<ContentAudienceValue, string>;

const audienceIcons = {
  STUDENT: GraduationCap,
  TEACHER: Presentation,
  BOTH: UsersRound,
} satisfies Record<ContentAudienceValue, typeof GraduationCap>;

export function CreateModuleForm({
  subjectId,
  closeHref,
  onCancel,
  onSuccess,
}: {
  subjectId: string;
  closeHref?: string;
  onCancel?: () => void;
  onSuccess?: (moduleId: string, message: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createAdminModuleAction,
    initialContentCreationActionState,
  );
  const titleErrorId = useId();
  const descriptionErrorId = useId();
  const audienceErrorId = useId();
  const subjectErrorId = useId();
  const values = state.status === "error" ? state.values : undefined;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.(state.createdId, state.message);
    }
  }, [onSuccess, state]);

  if (state.status === "success" && !onSuccess) {
    return <CreationActionFeedback state={state} />;
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="subjectId" value={subjectId} />
      <CreationActionFeedback state={state} />

      {fieldErrors?.subjectId ? (
        <CreationFieldError
          id={subjectErrorId}
          messages={fieldErrors?.subjectId}
        />
      ) : null}

      <ContentPanelSection
        icon={Library}
        title="Información del módulo"
        description="Completa los datos principales. Los recursos se añadirán por separado."
      >
        <div className="space-y-5">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Título del módulo
            <input
              name="title"
              type="text"
              minLength={2}
              maxLength={160}
              required
              autoFocus
              defaultValue={values?.title}
              disabled={isPending}
              aria-invalid={Boolean(fieldErrors?.title)}
              aria-describedby={titleErrorId}
              className={creationFieldClass}
            />
            <CreationFieldError id={titleErrorId} messages={fieldErrors?.title} />
          </label>

          <fieldset
            disabled={isPending}
            aria-describedby={audienceErrorId}
            aria-invalid={Boolean(fieldErrors?.audience)}
          >
            <legend className="text-sm font-medium text-foreground">
              Audiencia
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {contentAudienceValues.map((audience) => {
                const Icon = audienceIcons[audience];

                return (
                  <label
                    key={audience}
                    className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-3 text-center text-sm font-medium text-foreground transition hover:border-secondary/50 has-[:checked]:border-secondary has-[:checked]:bg-secondary/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-secondary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="audience"
                      value={audience}
                      defaultChecked={(values?.audience ?? "BOTH") === audience}
                    />
                    <Icon aria-hidden="true" className="h-5 w-5 text-secondary" />
                    <span>{audienceLabels[audience]}</span>
                  </label>
                );
              })}
            </div>
            <CreationFieldError
              id={audienceErrorId}
              messages={fieldErrors?.audience}
            />
          </fieldset>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Descripción <span className="font-normal text-muted">(opcional)</span>
            <textarea
              name="description"
              rows={5}
              maxLength={1_000}
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
        onCancel={onCancel}
        isPending={isPending}
        submitLabel="Publicar módulo"
        pendingLabel="Procesando…"
        submitName="disposition"
        submitValue="PUBLISH"
        secondarySubmit={{ label: "Guardar borrador", value: "DRAFT" }}
      />
    </form>
  );
}

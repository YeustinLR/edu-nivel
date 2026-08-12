"use client";

import {
  CircleCheck,
  CircleOff,
  MessageSquareWarning,
  RotateCcw,
  Send,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState } from "react";

import { transitionEditorialContentAction } from "@/modules/content/actions/editorial-actions";
import type { EditorialTransition } from "@/modules/content/domain/editorial-workflow";
import { initialEditorialActionState } from "@/modules/content/types/editorial-action-state";

type ControlDefinition = {
  label: string;
  confirmLabel: string;
  description: string;
  needsConfirmation: boolean;
  className: string;
  icon: LucideIcon;
};

const controls: Record<EditorialTransition, ControlDefinition> = {
  SUBMIT_FOR_REVIEW: {
    label: "Enviar a revisión",
    confirmLabel: "Enviar",
    description: "El contenido quedará pendiente de revisión.",
    needsConfirmation: false,
    className: "bg-secondary text-white hover:bg-secondary/90",
    icon: Send,
  },
  WITHDRAW_REVIEW: {
    label: "Retirar revisión",
    confirmLabel: "Sí, retirar",
    description: "El contenido volverá al estado de borrador.",
    needsConfirmation: true,
    className: "border border-border bg-background text-foreground hover:bg-surface-elevated",
    icon: RotateCcw,
  },
  PUBLISH_DIRECT: {
    label: "Publicar",
    confirmLabel: "Sí, publicar",
    description: "Se publicará directamente, sin pasar por revisión.",
    needsConfirmation: true,
    className: "bg-success text-white hover:opacity-90",
    icon: CircleCheck,
  },
  PUBLISH: {
    label: "Publicar",
    confirmLabel: "Sí, publicar",
    description: "Quedará disponible para los usuarios que tengan acceso.",
    needsConfirmation: true,
    className: "bg-success text-white hover:opacity-90",
    icon: CircleCheck,
  },
  REQUEST_CHANGES: {
    label: "Solicitar cambios",
    confirmLabel: "Enviar observaciones",
    description: "El contenido volverá al autor con tus observaciones.",
    needsConfirmation: true,
    className: "border border-orange-500/50 bg-background text-orange-700 hover:bg-orange-500/10 dark:text-orange-300",
    icon: MessageSquareWarning,
  },
  UNPUBLISH: {
    label: "Despublicar",
    confirmLabel: "Sí, despublicar",
    description: "Dejará de estar disponible para estudiantes y docentes.",
    needsConfirmation: true,
    className: "border border-red-500/50 bg-background text-red-700 hover:bg-red-500/10 dark:text-red-300",
    icon: CircleOff,
  },
};

function HiddenFields({
  targetType,
  targetId,
  parentId,
  transition,
}: {
  targetType: "module" | "resource";
  targetId: string;
  parentId: string;
  transition: EditorialTransition;
}) {
  return (
    <>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="transition" value={transition} />
    </>
  );
}

export function EditorialControls({
  targetType,
  targetId,
  parentId,
  transitions,
  layout = "inline",
  variant = "default",
  targetTitle,
  initialReviewNote,
  successHref,
}: {
  targetType: "module" | "resource";
  targetId: string;
  parentId: string;
  transitions: EditorialTransition[];
  layout?: "inline" | "stacked";
  variant?: "default" | "review-workspace";
  targetTitle?: string;
  initialReviewNote?: string | null;
  successHref?: string;
}) {
  const router = useRouter();
  const [selectedTransition, setSelectedTransition] =
    useState<EditorialTransition | null>(null);
  const [reviewNote, setReviewNote] = useState(initialReviewNote ?? "");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [state, formAction, isPending] = useActionState(
    transitionEditorialContentAction,
    initialEditorialActionState,
  );
  const reviewNoteHelpId = useId();
  const reviewNoteErrorId = useId();
  const isReviewWorkspace = variant === "review-workspace";
  const isStacked = layout === "stacked";
  const canRequestChanges = transitions.includes("REQUEST_CHANGES");

  useEffect(() => {
    if (state.status !== "success") return;
    if (successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  const activeTransition = state.status === "success" ? null : selectedTransition;
  const selectedControl = activeTransition
    ? controls[activeTransition]
    : null;
  const needsReviewNote = activeTransition === "REQUEST_CHANGES";
  const needsReviewConfirmation = activeTransition === "PUBLISH";

  return (
    <div className="space-y-4">
      {isReviewWorkspace && canRequestChanges ? (
        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          Observación para el autor
          <textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            maxLength={500}
            rows={5}
            aria-describedby={`${reviewNoteHelpId} ${reviewNoteErrorId}`}
            placeholder="Describe con claridad cualquier ajuste necesario."
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal leading-6 text-foreground outline-none placeholder:text-muted focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20"
          />
          <span id={reviewNoteHelpId} className="flex justify-between gap-3 text-xs font-normal text-muted">
            <span>Obligatoria al solicitar cambios.</span>
            <span aria-live="polite">{reviewNote.length}/500</span>
          </span>
          <span id={reviewNoteErrorId} className="block min-h-4 text-xs font-normal text-red-600 dark:text-red-400">
            {state.status === "error" ? state.fieldErrors?.reviewNote?.[0] : null}
          </span>
        </label>
      ) : null}

      <div className={isStacked ? "grid gap-2" : "flex flex-wrap gap-2"}>
        {transitions.map((transition) => {
          const control = controls[transition];
          const Icon = control.icon;

          if (control.needsConfirmation) {
            return (
              <button
                key={transition}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setSelectedTransition((current) =>
                    current === transition ? null : transition,
                  );
                  if (transition !== "PUBLISH") setReviewConfirmed(false);
                }}
                aria-expanded={activeTransition === transition}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 ${isStacked ? "w-full" : ""} ${control.className}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {control.label}
              </button>
            );
          }

          return (
            <form key={transition} action={formAction} className={isStacked ? "w-full" : undefined}>
              <HiddenFields
                targetType={targetType}
                targetId={targetId}
                parentId={parentId}
                transition={transition}
              />
              <button
                type="submit"
                disabled={isPending}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 ${isStacked ? "w-full" : ""} ${control.className}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {isPending ? "Procesando…" : control.label}
              </button>
            </form>
          );
        })}
      </div>

      {activeTransition && selectedControl ? (
        <form action={formAction} className="rounded-xl border border-border bg-surface p-4">
          <HiddenFields
            targetType={targetType}
            targetId={targetId}
            parentId={parentId}
            transition={activeTransition}
          />
          {needsReviewNote && isReviewWorkspace ? (
            <input type="hidden" name="reviewNote" value={reviewNote} />
          ) : null}
          {needsReviewConfirmation ? (
            <input type="hidden" name="reviewConfirmed" value={reviewConfirmed ? "true" : "false"} />
          ) : null}

          <p className="text-sm font-semibold text-foreground">
            {selectedControl.label}{targetTitle ? `: ${targetTitle}` : ""}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {selectedControl.description}
          </p>

          {needsReviewNote && !isReviewWorkspace ? (
            <label className="mt-4 block space-y-1.5 text-sm font-medium text-foreground">
              Observación para el autor
              <textarea
                name="reviewNote"
                required
                minLength={3}
                maxLength={500}
                rows={5}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20"
              />
            </label>
          ) : null}

          {needsReviewConfirmation ? (
            <label className="mt-4 flex items-start gap-3 rounded-lg border border-secondary/20 bg-background p-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(event) => setReviewConfirmed(event.target.checked)}
                disabled={isPending}
                className="mt-0.5 h-4 w-4 accent-secondary"
              />
              Confirmo que revisé este contenido
            </label>
          ) : null}

          {state.status === "error" ? (
            <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {state.message}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setSelectedTransition(null)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                (needsReviewConfirmation && !reviewConfirmed) ||
                (needsReviewNote && isReviewWorkspace && reviewNote.trim().length < 3)
              }
              className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 ${selectedControl.className}`}
            >
              {isPending ? "Procesando…" : selectedControl.confirmLabel}
            </button>
          </div>
        </form>
      ) : null}

      <div aria-live="polite">
        {state.status === "success" ? (
          <p role="status" className="text-sm text-success">{state.message}</p>
        ) : state.status === "error" && !activeTransition ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
        ) : null}
      </div>

      {transitions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
          No hay acciones editoriales disponibles para el estado actual.
        </p>
      ) : null}
    </div>
  );
}

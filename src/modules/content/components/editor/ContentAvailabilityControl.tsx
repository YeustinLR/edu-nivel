"use client";

import { Archive, RotateCcw } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { setContentAvailabilityAction } from "@/modules/content/actions/content-edit-actions";
import { EditActionFeedback } from "@/modules/content/components/editor/ContentEditForm";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

const FEEDBACK_DURATION_MS = 3_000;

export function ContentAvailabilityControl({
  type,
  id,
  isActive,
  updatedAt,
  canChange,
  unavailableReason,
  variant = "default",
}: {
  type: "level" | "subject" | "module" | "resource";
  id: string;
  isActive: boolean;
  updatedAt: string;
  canChange: boolean;
  unavailableReason?: string;
  variant?: "default" | "card";
}) {
  const [state, formAction, isPending] = useActionState(
    setContentAvailabilityAction,
    initialContentEditActionState,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(true);

  useEffect(() => {
    if (state.status === "idle") return;
    const timeoutId = window.setTimeout(
      () => setFeedbackVisible(false),
      FEEDBACK_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [state]);

  const showConfirmation = isConfirming && state.status !== "success";
  const isLevel = type === "level";
  const isCard = variant === "card";
  const actionLabel = isActive
    ? isLevel ? "Archivar nivel" : "Archivar"
    : isLevel ? "Reactivar nivel" : "Reactivar";
  const confirmationTitle = isActive
    ? isLevel ? "¿Archivar este nivel?" : "¿Archivar este contenido?"
    : isLevel ? "¿Reactivar este nivel?" : "¿Reactivar este contenido?";
  const confirmLabel = isActive
    ? isLevel ? "Sí, archivar nivel" : "Sí, archivar"
    : isLevel ? "Sí, reactivar nivel" : "Sí, reactivar";
  const AvailabilityIcon = isActive ? Archive : RotateCcw;

  return (
    <section className={isCard ? "flex h-full flex-col gap-4" : "space-y-3 border-t border-border pt-5"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {isCard ? (
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-surface-elevated text-foreground-secondary" : "bg-success/10 text-success"}`}>
              <AvailabilityIcon aria-hidden="true" className="h-4 w-4" />
            </span>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Disponibilidad
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              {isActive
                ? isLevel
                  ? "Ocúltalo para nuevas compras sin interrumpir accesos vigentes."
                  : "Archivar oculta el contenido sin eliminarlo de la base de datos."
                : isLevel
                  ? "Vuelve a mostrarlo en los catálogos disponibles."
                  : "Reactivar vuelve a incluir el contenido en el catálogo correspondiente."}
            </p>
          </div>
        </div>
        {isCard ? (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive ? "bg-success/10 text-success" : "bg-surface-elevated text-muted"}`}>
            {isActive ? "Activo" : "Archivado"}
          </span>
        ) : null}
      </div>

      {feedbackVisible && !showConfirmation ? (
        <EditActionFeedback state={state} />
      ) : null}

      {!showConfirmation ? (
        <button
          type="button"
          disabled={!canChange || isPending}
          onClick={() => setIsConfirming(true)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 ${isCard ? "mt-auto w-full sm:w-fit" : ""} ${
            isActive
              ? "border-border bg-background text-foreground hover:bg-surface-elevated"
              : "border-success/40 text-success hover:bg-success/10"
          }`}
        >
          <AvailabilityIcon aria-hidden="true" className="h-4 w-4" />
          {actionLabel}
        </button>
      ) : (
        <form
          action={formAction}
          onSubmit={() => setFeedbackVisible(true)}
          className={`rounded-xl border p-4 ${
            isActive
              ? "border-border bg-surface-elevated/50"
              : "border-success/30 bg-success/5"
          }`}
        >
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
          <input type="hidden" name="isActive" value={String(!isActive)} />
          <p className="text-sm font-semibold text-foreground">
            {confirmationTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {isActive
              ? isLevel
                ? "No se eliminará. Quienes ya pagaron conservarán acceso hasta su vencimiento."
                : "No se eliminará y podrás reactivarlo cuando lo necesites."
              : "Volverá a estar activo si el resto de la jerarquía está disponible."}
          </p>
          {state.status === "error" && feedbackVisible ? (
            <div className="mt-3">
              <EditActionFeedback state={state} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setIsConfirming(false);
                setFeedbackVisible(false);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 ${
                isActive ? "bg-red-600 hover:bg-red-700" : "bg-success-fill"
              }`}
            >
              {isPending
                ? "Procesando…"
                : confirmLabel}
            </button>
          </div>
        </form>
      )}
      {!canChange && unavailableReason ? (
        <p className="text-xs leading-5 text-muted">{unavailableReason}</p>
      ) : null}
    </section>
  );
}

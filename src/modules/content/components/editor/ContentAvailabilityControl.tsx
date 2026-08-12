"use client";

import { useActionState, useState } from "react";

import { setContentAvailabilityAction } from "@/modules/content/actions/content-edit-actions";
import { EditActionFeedback } from "@/modules/content/components/editor/ContentEditForm";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

export function ContentAvailabilityControl({
  type,
  id,
  isActive,
  updatedAt,
  canChange,
  unavailableReason,
}: {
  type: "level" | "subject" | "module" | "resource";
  id: string;
  isActive: boolean;
  updatedAt: string;
  canChange: boolean;
  unavailableReason?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    setContentAvailabilityAction,
    initialContentEditActionState,
  );
  const [isConfirming, setIsConfirming] = useState(false);

  const showConfirmation = isConfirming && state.status !== "success";

  return (
    <section className="space-y-3 border-t border-border pt-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Disponibilidad
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          {isActive
            ? "Archivar oculta el contenido sin eliminarlo de la base de datos."
            : "Reactivar vuelve a incluir el contenido en el catálogo correspondiente."}
        </p>
      </div>

      <EditActionFeedback state={state} />

      {!showConfirmation ? (
        <button
          type="button"
          disabled={!canChange || isPending}
          onClick={() => setIsConfirming(true)}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive
              ? "border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300"
              : "border-success/40 text-success hover:bg-success/10"
          }`}
        >
          {isActive ? "Archivar" : "Reactivar"}
        </button>
      ) : (
        <form
          action={formAction}
          className={`rounded-xl border p-4 ${
            isActive
              ? "border-red-500/30 bg-red-500/5"
              : "border-success/30 bg-success/5"
          }`}
        >
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
          <input type="hidden" name="isActive" value={String(!isActive)} />
          <p className="text-sm font-semibold text-foreground">
            {isActive ? "¿Archivar este contenido?" : "¿Reactivar este contenido?"}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {isActive
              ? "No se eliminará y podrás reactivarlo cuando lo necesites."
              : "Volverá a estar activo si el resto de la jerarquía está disponible."}
          </p>
          {state.status === "error" ? (
            <div className="mt-3">
              <EditActionFeedback state={state} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsConfirming(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 ${
                isActive ? "bg-red-600 hover:bg-red-700" : "bg-success"
              }`}
            >
              {isPending
                ? "Procesando…"
                : isActive
                  ? "Sí, archivar"
                  : "Sí, reactivar"}
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

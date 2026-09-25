"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { deleteAdminResourceAction } from "@/modules/content/actions/admin-resource-delete-actions";
import { initialAdminResourceDeleteActionState } from "@/modules/content/types/admin-resource-delete-action-state";

export function AdminResourceDeletionControl({
  resourceId,
  title,
  activeSubscriptionCount,
  unresolvedPaymentCount,
}: {
  resourceId: string;
  title: string;
  activeSubscriptionCount: number;
  unresolvedPaymentCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    deleteAdminResourceAction,
    initialAdminResourceDeleteActionState,
  );
  const confirmationErrorId = useId();
  const blocked =
    activeSubscriptionCount > 0 || unresolvedPaymentCount > 0;
  const confirmationError =
    state.status === "error"
      ? state.fieldErrors?.confirmationTitle?.[0]
      : undefined;

  return (
    <section className="border-t border-border pt-4" aria-labelledby="delete-resource-heading">
      <div className="flex items-start gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <h3 id="delete-resource-heading" className="text-sm font-semibold text-red-700 dark:text-red-300">Eliminar recurso</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            {blocked
              ? "No puede eliminarse mientras el nivel tenga accesos o pagos en curso."
              : "Esta acción elimina permanentemente el recurso, su progreso y sus archivos."}
          </p>
        </div>
      </div>
      {blocked ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeSubscriptionCount > 0 ? <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">{activeSubscriptionCount} {activeSubscriptionCount === 1 ? "suscripción vigente" : "suscripciones vigentes"}</span> : null}
          {unresolvedPaymentCount > 0 ? <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">{unresolvedPaymentCount} {unresolvedPaymentCount === 1 ? "pago pendiente" : "pagos pendientes"}</span> : null}
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} disabled={blocked} className="mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-red-500/40 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:border-border disabled:text-muted disabled:hover:bg-transparent dark:text-red-300">
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        {blocked ? "Eliminación bloqueada" : "Eliminar permanentemente"}
      </button>
      {open && !blocked ? (
        <form action={formAction} className="mt-4 space-y-3 border-t border-border pt-4">
          <input type="hidden" name="resourceId" value={resourceId} />
          <label className="block space-y-1.5 text-xs font-medium text-foreground">
            Escribe <strong>{title}</strong> para confirmar
            <input name="confirmationTitle" type="text" required maxLength={160} autoComplete="off" disabled={isPending} aria-describedby={confirmationErrorId} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:opacity-60" />
          </label>
          <span id={confirmationErrorId} role={confirmationError ? "alert" : undefined} className="block min-h-4 text-xs text-red-600 dark:text-red-400">{confirmationError}</span>
          {state.status === "error" && !confirmationError ? <p role="alert" className="text-xs leading-5 text-red-700 dark:text-red-300">{state.message}</p> : null}
          <button type="submit" disabled={isPending} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? "Eliminando…" : "Confirmar eliminación"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

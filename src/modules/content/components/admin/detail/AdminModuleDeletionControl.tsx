"use client";

import type { PublicationStatus } from "@/generated/prisma/enums";
import { Trash2, TriangleAlert } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { deleteAdminModuleAction } from "@/modules/content/actions/admin-module-delete-actions";
import { isModulePermanentlyDeletable } from "@/modules/content/domain/content-permissions";
import { initialAdminModuleDeleteActionState } from "@/modules/content/types/admin-module-delete-action-state";

export function AdminModuleDeletionControl({
  moduleId,
  title,
  publicationStatus,
  resourceCount,
}: {
  moduleId: string;
  title: string;
  publicationStatus: PublicationStatus;
  resourceCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    deleteAdminModuleAction,
    initialAdminModuleDeleteActionState,
  );
  const confirmationErrorId = useId();
  const canDelete = isModulePermanentlyDeletable(publicationStatus);
  const confirmationError =
    state.status === "error"
      ? state.fieldErrors?.confirmationTitle?.[0]
      : undefined;

  return (
    <section
      className="border-t border-border pt-4"
      aria-labelledby="delete-module-heading"
    >
      <div className="flex items-start gap-2">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
        />
        <div>
          <h3
            id="delete-module-heading"
            className="text-sm font-semibold text-red-700 dark:text-red-300"
          >
            Eliminar módulo
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Esta acción elimina permanentemente el módulo, sus {resourceCount}{" "}
            {resourceCount === 1 ? "recurso" : "recursos"} y el progreso asociado.
          </p>
        </div>
      </div>

      {canDelete ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-red-500/40 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-red-300"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          Eliminar permanentemente
        </button>
      ) : (
        <p className="mt-3 text-xs font-medium text-muted">
          {publicationStatus === "PUBLISHED"
            ? "Despublica el módulo antes de eliminarlo."
            : "Retira el módulo de revisión antes de eliminarlo."}
        </p>
      )}

      {open && canDelete ? (
        <form
          action={formAction}
          className="mt-4 space-y-3 border-t border-border pt-4"
        >
          <input type="hidden" name="moduleId" value={moduleId} />
          <label className="block space-y-1.5 text-xs font-medium text-foreground">
            Escribe <strong>{title}</strong> para confirmar
            <input
              name="confirmationTitle"
              type="text"
              required
              maxLength={160}
              autoComplete="off"
              disabled={isPending}
              aria-describedby={confirmationErrorId}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:opacity-60"
            />
          </label>
          <span
            id={confirmationErrorId}
            role={confirmationError ? "alert" : undefined}
            className="block min-h-4 text-xs text-red-600 dark:text-red-400"
          >
            {confirmationError}
          </span>
          {state.status === "error" && !confirmationError ? (
            <p
              role="alert"
              className="text-xs leading-5 text-red-700 dark:text-red-300"
            >
              {state.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Eliminando…" : "Confirmar eliminación"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

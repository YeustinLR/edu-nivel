"use client";

import { LockKeyhole, UnlockKeyhole } from "lucide-react";
import { useActionState } from "react";

import { setResourceFreePreviewAction } from "@/modules/content/actions/content-edit-actions";
import { EditActionFeedback } from "@/modules/content/components/editor/ContentEditForm";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

export function ResourceFreeAccessControl({
  resourceId,
  isFreePreview,
  levelRequiresSubscription,
  updatedAt,
}: {
  resourceId: string;
  isFreePreview: boolean;
  levelRequiresSubscription: boolean;
  updatedAt: string;
}) {
  const [state, formAction, isPending] = useActionState(
    setResourceFreePreviewAction,
    initialContentEditActionState,
  );
  const AccessIcon = isFreePreview ? UnlockKeyhole : LockKeyhole;

  return (
    <section className="space-y-4 border-t border-border pt-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isFreePreview ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-surface-elevated text-muted"}`}>
            <AccessIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Acceso al recurso
              </h3>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isFreePreview ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-violet-500/10 text-violet-700 dark:text-violet-300"}`}>
                {isFreePreview
                  ? "Gratuito"
                  : levelRequiresSubscription
                    ? "Requiere suscripción"
                    : "Incluido con el nivel"}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
              {isFreePreview
                ? "Se puede abrir sin suscripción cuando su nivel, materia y módulo estén publicados."
                : levelRequiresSubscription
                  ? "Solo puede abrirse con una suscripción vigente al nivel."
                  : "Este nivel no requiere suscripción, por lo que el recurso ya está incluido."}
            </p>
          </div>
        </div>

        <form action={formAction}>
          <input type="hidden" name="id" value={resourceId} />
          <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
          <input
            type="hidden"
            name="isFreePreview"
            value={String(!isFreePreview)}
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isPending
              ? "Guardando…"
              : isFreePreview
                ? "Requerir suscripción"
                : "Ofrecer gratis"}
          </button>
        </form>
      </div>
      <EditActionFeedback state={state} />
    </section>
  );
}

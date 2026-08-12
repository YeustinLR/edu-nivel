"use client";

import { Ban, CheckCircle2, RotateCcw } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

import { manageAdminUserSuspensionAction } from "@/modules/users/actions/admin-user-suspension-actions";
import {
  AdminUserActionFeedback,
  AdminUserFieldError,
  adminUserFieldClass,
} from "@/modules/users/components/admin/AdminUserFormPrimitives";
import { initialAdminUserSuspensionActionState } from "@/modules/users/types/admin-user-suspension-action-state";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AdminUserSuspensionControl({
  userId,
  canManage,
  suspendedAt,
  suspensionReason,
  suspensionExpiresAt,
}: {
  userId: string;
  canManage: boolean;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  suspensionExpiresAt: Date | null;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    manageAdminUserSuspensionAction,
    initialAdminUserSuspensionActionState,
  );
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const reasonErrorId = useId();
  const isSuspended = Boolean(suspendedAt && (!suspensionExpiresAt || suspensionExpiresAt > new Date()));

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSuspended ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-success/10 text-success"}`}>
            {isSuspended ? <Ban aria-hidden="true" className="h-4 w-4" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground">Estado de acceso</h2>
            <p className="mt-0.5 text-sm text-muted">
              {isSuspended ? "El usuario no puede iniciar sesión mientras la suspensión esté activa." : "El usuario puede iniciar sesión normalmente."}
            </p>
            {isSuspended ? (
              <div className="mt-3 space-y-1 text-xs text-muted">
                {suspensionReason ? <p><span className="font-medium text-foreground">Motivo:</span> {suspensionReason}</p> : null}
                {suspensionExpiresAt ? <p><span className="font-medium text-foreground">Hasta:</span> {dateFormatter.format(suspensionExpiresAt)}</p> : <p>Sin fecha de reactivación automática.</p>}
              </div>
            ) : null}
          </div>
        </div>

        {canManage ? (
          isSuspended ? (
            <form action={formAction} className="shrink-0">
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="operation" value="reactivate" />
              <input type="hidden" name="reason" value="Reactivación administrativa" />
              <input type="hidden" name="expiresAt" value="" />
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-success px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {isPending ? "Reactivando…" : "Reactivar"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowSuspendForm((current) => !current)}
              aria-expanded={showSuspendForm}
              disabled={isPending}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300"
            >
              <Ban aria-hidden="true" className="h-4 w-4" />
              Suspender
            </button>
          )
        ) : (
          <p className="shrink-0 text-xs font-medium text-muted">Tu cuenta no puede suspenderse a sí misma.</p>
        )}
      </div>

      {showSuspendForm && canManage && !isSuspended ? (
        <form action={formAction} className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_16rem_auto] sm:items-end">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="operation" value="suspend" />
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Motivo
            <textarea
              name="reason"
              required
              minLength={3}
              maxLength={500}
              rows={2}
              disabled={isPending}
              aria-describedby={reasonErrorId}
              className={`${adminUserFieldClass} resize-y`}
              placeholder="Explica por qué se suspende el acceso."
            />
            <AdminUserFieldError id={reasonErrorId} messages={state.status === "error" ? state.fieldErrors?.reason : undefined} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Reactivar el
            <input
              name="expiresAt"
              type="datetime-local"
              disabled={isPending}
              className={adminUserFieldClass}
            />
            <span className="block min-h-4 text-xs font-normal text-muted">Vacío = indefinida.</span>
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Suspendiendo…" : "Confirmar suspensión"}
          </button>
        </form>
      ) : null}

      {state.status !== "idle" ? <div className="mt-4"><AdminUserActionFeedback state={state.status === "success" ? state : { status: state.status, message: state.message }} /></div> : null}
    </section>
  );
}

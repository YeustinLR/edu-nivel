"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { deleteAdminUserAction } from "@/modules/users/actions/admin-user-management-actions";
import { AdminUserFieldError, adminUserFieldClass } from "@/modules/users/components/admin/AdminUserFormPrimitives";
import { initialAdminUserDeleteActionState } from "@/modules/users/types/admin-user-delete-action-state";

export function AdminUserDeletionControl({ userId, email, canDelete }: { userId: string; email: string; canDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(deleteAdminUserAction, initialAdminUserDeleteActionState);
  const emailErrorId = useId();
  const reasonErrorId = useId();

  return (
    <section className="rounded-xl border border-red-500/30 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-red-700 dark:text-red-300">Eliminar usuario</h2>
          <p className="mt-1 text-sm text-muted">Revoca el acceso y anonimiza los datos personales conservando el historial necesario.</p>
        </div>
        {canDelete ? (
          <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Eliminar usuario
          </button>
        ) : <p className="text-xs font-medium text-muted">Tu cuenta administradora está protegida.</p>}
      </div>

      {open && canDelete ? (
        <form action={formAction} className="mt-4 space-y-4 border-t border-border pt-4">
          <input type="hidden" name="userId" value={userId} />
          <p className="text-sm text-muted">Escribe <strong className="text-foreground">{email}</strong> para confirmar.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-foreground">
              Correo de confirmación
              <input name="confirmationEmail" type="email" required disabled={isPending} autoComplete="off" className={adminUserFieldClass} aria-describedby={emailErrorId} />
              <AdminUserFieldError id={emailErrorId} messages={state.status === "error" ? state.fieldErrors?.confirmationEmail : undefined} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-foreground">
              Motivo
              <textarea name="reason" required minLength={5} maxLength={500} disabled={isPending} rows={2} className={`${adminUserFieldClass} resize-y`} aria-describedby={reasonErrorId} />
              <AdminUserFieldError id={reasonErrorId} messages={state.status === "error" ? state.fieldErrors?.reason : undefined} />
            </label>
          </div>
          {state.status === "error" ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{state.message}</p> : null}
          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {isPending ? "Eliminando…" : "Confirmar eliminación"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

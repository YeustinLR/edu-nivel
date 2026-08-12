"use client";

import { RotateCcw, X, XCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { manageAdminUserInvitationAction } from "@/modules/users/actions/admin-user-invitation-actions";
import { initialAdminUserInvitationOperationState } from "@/modules/users/types/admin-user-invitation-operation-state";

export function PendingInvitationActions({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    manageAdminUserInvitationAction,
    initialAdminUserInvitationOperationState,
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const relevantMessage =
    state.status !== "idle" && state.invitationId === invitationId
      ? state
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        <form action={formAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="operation" value="resend" />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            {isPending ? "Enviando…" : "Reenviar"}
          </button>
        </form>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirmingCancel((current) => !current)}
          aria-expanded={confirmingCancel}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50 dark:text-red-300"
        >
          <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>

      {confirmingCancel ? (
        <form
          action={formAction}
          className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-left"
        >
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="operation" value="cancel" />
          <p className="text-xs leading-5 text-muted">
            El enlace dejará de funcionar inmediatamente.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmingCancel(false)}
              className="inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-surface-elevated"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Volver
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-8 items-center rounded-md bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "Cancelando…" : "Sí, cancelar"}
            </button>
          </div>
        </form>
      ) : null}

      {relevantMessage?.status === "error" ? (
        <p role="alert" className="text-right text-xs text-red-600 dark:text-red-300">
          {relevantMessage.message}
        </p>
      ) : null}
    </div>
  );
}

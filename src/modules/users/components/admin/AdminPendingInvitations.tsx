import { Clock3, MailCheck } from "lucide-react";

import { PendingInvitationActions } from "@/modules/users/components/admin/PendingInvitationActions";
import { userRoleLabels } from "@/modules/users/domain/user-role";
import { getAdminPendingUserInvitations } from "@/server/users/admin-user-invitation-queries";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function AdminPendingInvitationsSkeleton() {
  return (
    <div className="h-14 animate-pulse rounded-xl border border-border bg-card" />
  );
}

export async function AdminPendingInvitations() {
  const invitations = await getAdminPendingUserInvitations();
  if (invitations.length === 0) return null;

  const now = new Date();

  return (
    <details className="group overflow-hidden rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <MailCheck aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">
              Invitaciones pendientes
            </span>
            <span className="block text-sm text-muted">
              {invitations.length} {invitations.length === 1 ? "enlace activo" : "enlaces activos"}
            </span>
          </span>
        </span>
        <span className="text-xs font-medium text-secondary group-open:hidden">
          Administrar
        </span>
        <span className="hidden text-xs font-medium text-secondary group-open:inline">
          Ocultar
        </span>
      </summary>

      <ul className="divide-y divide-border border-t border-border">
        {invitations.map((invitation) => {
          const expired = invitation.expiresAt <= now;

          return (
            <li
              key={invitation.id}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {invitation.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      expired
                        ? "bg-red-500/10 text-red-700 dark:text-red-300"
                        : "bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {expired ? "Expirada" : "Pendiente"}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">{invitation.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{userRoleLabels[invitation.role]}</span>
                  {invitation.levelNumber ? <span>· Nivel {invitation.levelNumber}</span> : null}
                  <span className="inline-flex items-center gap-1">
                    <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                    {expired ? "Expiró" : "Expira"} {dateFormatter.format(invitation.expiresAt)}
                  </span>
                </div>
              </div>
              <PendingInvitationActions invitationId={invitation.id} />
            </li>
          );
        })}
      </ul>
    </details>
  );
}

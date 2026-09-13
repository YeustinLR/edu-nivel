import { CalendarClock, CheckCheck, Code2, Eye, EyeOff, Mail, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { CopyIdentifierButton, ResendNotificationButton } from "@/modules/notifications/components/NotificationControls";
import { NotificationEmptyState, NotificationPagination } from "@/modules/notifications/components/NotificationPageParts";
import { notificationDate, notificationTypeLabels } from "@/modules/notifications/domain/notifications";
import { getAdminNotification } from "@/server/notifications/queries";

const audienceLabels = {
  SELECTED_USERS: "Usuarios seleccionados",
  ALL_USERS: "Todos los usuarios habilitados",
  ROLES: "Roles seleccionados",
  SUBSCRIPTIONS: "Suscripciones seleccionadas",
} as const;

const roleLabels = { STUDENT: "Estudiantes", TEACHER: "Docentes", COLLABORATOR: "Colaboradores", ADMIN: "Administradores" } as const;

export default async function AdminNotificationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; recipientId?: string }> }) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const data = await getAdminNotification(id, search.page, search.recipientId);
  if (!data) notFound();

  const n = data.notification;
  const unread = Math.max(0, data.total - data.read);
  const readPercentage = data.total ? Math.round((data.read / data.total) * 100) : 0;
  const roles = n.audienceRoles.map(role => roleLabels[role]).join(", ");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Detalle del envío"
        title={n.title}
        description={`${notificationTypeLabels[n.type]} · ${notificationDate(n.sentAt)}`}
        breadcrumbs={[{ label: "Panel", href: "/dashboard/admin" }, { label: "Notificaciones", href: "/dashboard/admin/notifications" }, { label: "Detalle" }]}
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-secondary/[0.08] via-card to-card p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-2xl">
              <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">{notificationTypeLabels[n.type]}</span>
              <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-foreground sm:text-base">{n.body}</p>
            </div>
            <div className="flex min-w-52 items-center gap-3 rounded-2xl border border-border/80 bg-background/80 p-3">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 font-semibold text-secondary">{n.sentBy.name.charAt(0).toLocaleUpperCase("es-CR")}</span>
              <div className="min-w-0">
                <p className="text-xs text-muted">Enviado por</p>
                <p className="truncate text-sm font-semibold text-foreground">{n.sentBy.name}</p>
                <p className="truncate text-xs text-muted">{n.sentBy.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { label: "Entregadas", value: data.total, note: "destinatarios", icon: Users, color: "text-secondary" },
            { label: "Leídas", value: data.read, note: `${readPercentage}% del envío`, icon: CheckCheck, color: "text-success" },
            { label: "Sin leer", value: unread, note: "pendientes", icon: EyeOff, color: "text-amber-600" },
          ].map(item => {
            const Icon = item.icon;
            return <div key={item.label} className="p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted">{item.label}</p><Icon aria-hidden="true" className={`size-4 ${item.color}`} /></div><p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p><p className="mt-1 text-xs text-muted">{item.note}</p></div>;
          })}
        </div>

        <div className="border-t border-border px-5 py-4 text-sm">
          <p className="font-medium text-foreground">Alcance: {audienceLabels[n.audienceMode]}</p>
          {roles ? <p className="mt-1 text-muted">{roles}</p> : null}
          {n.resendOfRecipient ? <Link className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-secondary hover:underline" href={`/dashboard/admin/notifications/${encodeURIComponent(n.resendOfRecipient.notificationId)}`}>Ver envío anterior</Link> : null}
        </div>
      </section>

      <details className="rounded-2xl border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-muted hover:text-foreground sm:px-5">
          <Code2 aria-hidden="true" className="size-4" />Información técnica
        </summary>
        <dl className="space-y-3 border-t border-border px-4 py-4 text-xs sm:px-5">
          <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center"><dt className="text-muted">ID del envío</dt><dd className="truncate font-mono text-foreground" title={n.id}>{n.id}</dd><dd><CopyIdentifierButton value={n.id} /></dd></div>
          <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center"><dt className="text-muted">ID del emisor</dt><dd className="truncate font-mono text-foreground" title={n.sentBy.id}>{n.sentBy.id}</dd><dd><CopyIdentifierButton value={n.sentBy.id} /></dd></div>
        </dl>
      </details>

      <section aria-labelledby="notification-recipients-heading" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 id="notification-recipients-heading" className="font-semibold text-foreground">Destinatarios</h2>
            <p className="mt-0.5 text-sm text-muted">Consulta la entrega y primera lectura de cada persona.</p>
          </div>
          {search.recipientId ? <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-secondary hover:underline" href={`/dashboard/admin/notifications/${encodeURIComponent(id)}`}>Ver todos</Link> : null}
        </div>

        {!data.items.length ? <div className="p-4"><NotificationEmptyState title="Sin destinatarios" description="No hay destinatarios que coincidan con este filtro." /></div> : (
          <ul className="divide-y divide-border">
            {data.items.map(item => {
              const isCurrentReminder = item.subscriptionId && item.subscription?.currentPeriodEnd.getTime() === item.periodEndSnapshot?.getTime() && !item.user.deletedAt;
              return (
                <li key={item.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-muted"><UserRound className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-foreground">{item.user.name}</p>
                      {!item.user.deletedAt ? <p className="mt-0.5 flex items-center gap-1.5 break-all text-sm text-muted"><Mail aria-hidden="true" className="size-3.5 shrink-0" />{item.user.email}</p> : <p className="mt-0.5 text-sm text-muted">Cuenta eliminada</p>}
                      {item.periodEndSnapshot ? <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><CalendarClock aria-hidden="true" className="size-3.5" />Nivel {item.levelNumberSnapshot} · Vencimiento original: {notificationDate(item.periodEndSnapshot)}</p> : null}
                    </div>
                    <div className="sm:min-w-48 sm:text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.readAt ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-800 dark:text-amber-200"}`}>
                        {item.readAt ? <Eye aria-hidden="true" className="size-3.5" /> : <EyeOff aria-hidden="true" className="size-3.5" />}
                        {item.readAt ? "Leída" : "Sin leer"}
                      </span>
                      {item.readAt ? <p className="mt-1.5 text-xs text-muted">{notificationDate(item.readAt)}</p> : null}
                    </div>
                  </div>
                  {item.resend ? <Link className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-secondary hover:underline" href={`/dashboard/admin/notifications/${encodeURIComponent(item.resend.id)}`}>Ver reenvío</Link> : item.subscriptionId && !isCurrentReminder ? <p className="mt-3 text-sm text-muted">Recordatorio no vigente.</p> : item.subscriptionId ? <div className="mt-3"><ResendNotificationButton recipientId={item.id} /></div> : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-center border-t border-border px-4 py-3 sm:justify-end sm:px-5">
          <NotificationPagination pathname={`/dashboard/admin/notifications/${encodeURIComponent(id)}`} search={search} page={data.page} totalPages={data.totalPages} />
        </div>
      </section>
    </div>
  );
}

import { Suspense } from "react";
import { BellRing, CalendarClock, CheckCheck, CircleAlert } from "lucide-react";

import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationReadButton } from "@/modules/notifications/components/NotificationControls";
import { NotificationEmptyState, NotificationFilters, NotificationPagination, NotificationSkeleton } from "@/modules/notifications/components/NotificationPageParts";
import { notificationDate, notificationTypeLabels } from "@/modules/notifications/domain/notifications";
import { openNotificationRenewalAction } from "@/modules/notifications/actions/notification-actions";
import { getNotificationInbox, type NotificationSearch } from "@/server/notifications/queries";

const notificationVisuals = {
  GENERAL_ALERT: { icon: BellRing, className: "bg-secondary/10 text-secondary" },
  IMPORTANT_NOTICE: { icon: CircleAlert, className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  SUBSCRIPTION_RENEWAL: { icon: CalendarClock, className: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
} as const;

async function Inbox({ search }: { search: NotificationSearch }) {
  const data = await getNotificationInbox(search);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span className={`flex size-11 items-center justify-center rounded-2xl ${data.unreadCount ? "bg-secondary/10 text-secondary" : "bg-success/10 text-success"}`}>
            {data.unreadCount ? <BellRing aria-hidden="true" className="size-5" /> : <CheckCheck aria-hidden="true" className="size-5" />}
          </span>
          <div>
            <p className="font-semibold text-foreground">{data.unreadCount ? `${data.unreadCount} ${data.unreadCount === 1 ? "notificación pendiente" : "notificaciones pendientes"}` : "Estás al día"}</p>
            <p className="mt-0.5 text-sm text-muted">{data.unreadCount ? "Revísalas cuando tengas un momento." : "No tienes avisos nuevos por leer."}</p>
          </div>
        </div>
        <NotificationReadButton disabled={data.unreadCount === 0} />
      </section>

      {!data.items.length ? (
        <NotificationEmptyState
          title={search.unread === "1" ? "No tienes avisos pendientes" : "Tu bandeja está vacía"}
          description={search.type ? "No hay notificaciones de este tipo. Prueba con otro filtro." : "Los avisos importantes de EduNivel aparecerán aquí."}
        />
      ) : (
        <section aria-labelledby="personal-notifications-heading" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Actividad</p>
              <h2 id="personal-notifications-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground">Tus notificaciones</h2>
            </div>
            <span className="rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted">{data.total} resultados</span>
          </div>

          <ul className="space-y-3">
            {data.items.map(item => {
              const visual = notificationVisuals[item.notification.type];
              const Icon = visual.icon;
              const unread = !item.readAt;

              return (
                <li key={item.id}>
                  <article id={`notification-${item.id}`} className={`relative scroll-mt-28 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-shadow target:ring-2 target:ring-secondary target:ring-offset-2 target:ring-offset-background hover:shadow-md sm:p-5 ${unread ? "border-secondary/30" : "border-border"}`} aria-labelledby={`notification-title-${item.id}`}>
                    {unread ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-secondary" /> : null}
                    <div className="flex gap-3 sm:gap-4">
                      <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${visual.className}`}><Icon className="size-[18px]" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-full px-2.5 py-1 font-semibold ${visual.className}`}>{notificationTypeLabels[item.notification.type]}</span>
                          {unread ? <span className="inline-flex items-center gap-1.5 font-semibold text-secondary"><span aria-hidden="true" className="size-1.5 rounded-full bg-secondary" />Nueva</span> : <span className="text-muted">Leída</span>}
                          <time className="text-muted" dateTime={item.receivedAt.toISOString()}>{notificationDate(item.receivedAt)}</time>
                        </div>
                        <h3 id={`notification-title-${item.id}`} className="mt-3 break-words text-lg font-semibold text-foreground">{item.notification.title}</h3>
                        <p className="mt-1 text-xs font-medium text-muted">Administración de EduNivel</p>
                        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{item.notification.body}</p>
                        {item.periodEndSnapshot ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-surface-elevated px-3 py-2.5 text-sm text-foreground"><CalendarClock aria-hidden="true" className="size-4 shrink-0 text-muted" />Nivel {item.levelNumberSnapshot} · Vencimiento: {notificationDate(item.periodEndSnapshot)}</p> : null}
                        {item.renewalStatus ? <p className="mt-3 text-sm font-semibold text-muted">{item.renewalStatus}</p> : null}
                        <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-border/70 pt-4">
                          {unread ? <NotificationReadButton recipientId={item.id} /> : null}
                          {item.canRenew ? <form action={openNotificationRenewalAction}><input type="hidden" name="recipientId" value={item.id} /><button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">Renovar suscripción</button></form> : null}
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-center pt-2 sm:justify-end"><NotificationPagination pathname="/dashboard/notifications" search={search} page={data.page} totalPages={data.totalPages} /></div>
        </section>
      )}
    </div>
  );
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<NotificationSearch & { notice?: string }> }) {
  const search = await searchParams;
  const resultsKey = [search.type, search.unread, search.page].join(":");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-8">
      <AdminPageHeader eyebrow="Bandeja personal" title="Mis notificaciones" description="Avisos importantes de la administración de EduNivel. Este canal no admite respuestas." />
      {search.notice === "obsolete" ? <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">Este recordatorio ya no corresponde al período actual o la suscripción no está disponible para renovar.</p> : null}
      <NotificationFilters personal search={search} />
      <Suspense key={resultsKey} fallback={<NotificationSkeleton />}><Inbox search={search} /></Suspense>
    </div>
  );
}

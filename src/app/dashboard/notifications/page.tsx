import { Suspense } from "react";
import { getNotificationInbox, type NotificationSearch } from "@/server/notifications/queries";
import { notificationDate, notificationTypeLabels } from "@/modules/notifications/domain/notifications";
import { NotificationFilters, NotificationPagination, NotificationSkeleton } from "@/modules/notifications/components/NotificationPageParts";
import { NotificationReadButton } from "@/modules/notifications/components/NotificationControls";
import { openNotificationRenewalAction } from "@/modules/notifications/actions/notification-actions";

async function Inbox({ search }: { search: NotificationSearch }) {
  const data = await getNotificationInbox(search);
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><p>{data.unreadCount} sin leer</p><NotificationReadButton disabled={data.unreadCount === 0} /></div>
    {!data.items.length && <p className="rounded-xl border border-border p-6">{search.unread === "1" ? "No tienes notificaciones pendientes con estos filtros." : search.type ? "No hay notificaciones de este tipo." : "Todavía no tienes notificaciones."}</p>}
    <ul className="space-y-4">{data.items.map(item => <li key={item.id}><article id={`notification-${item.id}`} className="scroll-mt-28 space-y-3 rounded-xl border border-border bg-card p-5 target:ring-2 target:ring-secondary target:ring-offset-2 target:ring-offset-background" aria-labelledby={`notification-title-${item.id}`}>
      <div className="flex flex-wrap gap-3 text-sm text-muted"><span>{notificationTypeLabels[item.notification.type]}</span><span>{item.readAt ? "Leída" : "Sin leer"}</span><time dateTime={item.receivedAt.toISOString()}>{notificationDate(item.receivedAt)}</time></div>
      <h2 id={`notification-title-${item.id}`} className="break-words text-lg font-semibold">{item.notification.title}</h2>
      <p className="text-sm text-muted">Administración de EduNivel</p>
      <p className="whitespace-pre-wrap break-words">{item.notification.body}</p>
      {item.periodEndSnapshot && <p className="text-sm">Nivel {item.levelNumberSnapshot} · Vencimiento del período: {notificationDate(item.periodEndSnapshot)}</p>}
      {item.renewalStatus && <p className="text-sm font-semibold">{item.renewalStatus}</p>}
      <div className="flex flex-wrap items-start gap-3">
        {!item.readAt && <NotificationReadButton recipientId={item.id} />}
        {item.canRenew && <form action={openNotificationRenewalAction}><input type="hidden" name="recipientId" value={item.id} /><button className="min-h-11 rounded-lg bg-secondary px-4 py-2 font-semibold text-white">Renovar suscripción</button></form>}
      </div>
    </article></li>)}</ul>
    <NotificationPagination pathname="/dashboard/notifications" search={search} page={data.page} totalPages={data.totalPages} />
  </>;
}
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<NotificationSearch & { notice?: string }> }) {
  const search = await searchParams;
  return <div className="mx-auto max-w-4xl space-y-5"><h1 className="text-2xl font-semibold">Mis notificaciones</h1><p className="text-muted">Avisos de la administración. Este canal no admite respuestas.</p>
    {search.notice === "obsolete" && <p role="status" className="rounded-lg border border-border p-4">Este recordatorio ya no corresponde al período actual o la suscripción no está disponible para renovar.</p>}
    <NotificationFilters personal search={search} /><Suspense key={JSON.stringify(search)} fallback={<NotificationSkeleton />}><Inbox search={search} /></Suspense>
  </div>;
}

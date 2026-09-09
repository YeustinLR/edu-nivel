import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationPagination } from "@/modules/notifications/components/NotificationPageParts";
import { ResendNotificationButton } from "@/modules/notifications/components/NotificationControls";
import { notificationDate, notificationTypeLabels } from "@/modules/notifications/domain/notifications";
import { getAdminNotification } from "@/server/notifications/queries";

export default async function AdminNotificationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; recipientId?: string }> }) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const data = await getAdminNotification(id, search.page, search.recipientId);
  if (!data) notFound();
  const n = data.notification;
  return <div className="mx-auto max-w-5xl space-y-5"><AdminPageHeader title="Detalle del envío" description={`${notificationTypeLabels[n.type]} · ${notificationDate(n.sentAt)}`} breadcrumbs={[{ label: "Notificaciones", href: "/dashboard/admin/notifications" }, { label: "Detalle" }]} />
    <section className="space-y-3 rounded-xl border border-border bg-card p-5"><h2 className="break-words text-xl font-semibold">{n.title}</h2><p className="whitespace-pre-wrap break-words">{n.body}</p><p className="text-sm text-muted">Enviado por {n.sentBy.name} · ID {n.sentBy.id}</p><p>{data.total} entregas · {data.read} leídas</p><p className="text-sm">Alcance: {({ SELECTED_USERS: "Usuarios seleccionados", ALL_USERS: "Todos los usuarios habilitados", ROLES: "Roles seleccionados", SUBSCRIPTIONS: "Suscripciones seleccionadas" })[n.audienceMode]} {n.audienceRoles.join(", ")}</p>{n.resendOfRecipient && <Link className="underline" href={`/dashboard/admin/notifications/${n.resendOfRecipient.notificationId}`}>Ver envío anterior</Link>}</section>
    <h2 className="text-lg font-semibold">Destinatarios</h2>
    {search.recipientId && <Link className="inline-flex min-h-11 items-center underline" href={`/dashboard/admin/notifications/${id}`}>Ver todos los destinatarios del envío</Link>}
    {!data.items.length && <p>No hay destinatarios con este filtro.</p>}
    <ul className="divide-y divide-border">{data.items.map(item => <li key={item.id} className="space-y-2 py-4"><p className="break-words font-semibold">{item.user.name}</p>{!item.user.deletedAt && <p className="break-words text-sm text-muted">{item.user.email}</p>}<p className="text-sm">{item.readAt ? `Leída: ${notificationDate(item.readAt)}` : "Sin leer"}</p>{item.periodEndSnapshot && <p className="text-sm">Nivel {item.levelNumberSnapshot} · Vencimiento original: {notificationDate(item.periodEndSnapshot)}</p>}
      {item.resend ? <Link className="inline-flex min-h-11 items-center underline" href={`/dashboard/admin/notifications/${item.resend.id}`}>Ver reenvío</Link> : item.subscriptionId && (item.subscription?.currentPeriodEnd.getTime() !== item.periodEndSnapshot?.getTime() || item.user.deletedAt) ? <p>Recordatorio no vigente.</p> : item.subscriptionId ? <ResendNotificationButton recipientId={item.id} /> : null}
    </li>)}</ul><NotificationPagination pathname={`/dashboard/admin/notifications/${id}`} search={search} page={data.page} totalPages={data.totalPages} />
  </div>;
}

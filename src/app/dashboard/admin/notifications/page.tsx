import { Suspense } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationFilters, NotificationPagination, NotificationSkeleton } from "@/modules/notifications/components/NotificationPageParts";
import { notificationDate, notificationTypeLabels } from "@/modules/notifications/domain/notifications";
import { getAdminNotifications, type NotificationSearch } from "@/server/notifications/queries";

async function History({ search }: { search: NotificationSearch }) {
  const data = await getAdminNotifications(search);
  return <>{!data.items.length && <p className="rounded-xl border border-border p-6">No hay envíos con estos filtros.</p>}<ul className="divide-y divide-border">{data.items.map(item => <li key={item.id} className="py-4"><Link href={`/dashboard/admin/notifications/${item.id}`} className="block rounded-lg p-3 hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-secondary"><h2 className="break-words font-semibold">{item.title}</h2><p className="text-sm text-muted">{notificationTypeLabels[item.type]} · {item._count.recipients} entregas · {item.sentBy.name} · {notificationDate(item.sentAt)}</p></Link></li>)}</ul><NotificationPagination pathname="/dashboard/admin/notifications" search={search} page={data.page} totalPages={data.totalPages} /></>;
}
export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<NotificationSearch> }) {
  const search = await searchParams;
  return <div className="mx-auto max-w-6xl space-y-5"><AdminPageHeader title="Gestionar notificaciones" description="Envíos internos y su historial de lectura." actions={<div className="flex flex-wrap gap-3"><Link href="/dashboard/admin/notifications/new" className="inline-flex min-h-11 items-center rounded-lg bg-secondary px-4 text-white">Nuevo aviso</Link><Link href="/dashboard/admin/notifications/renewals" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4">Recordatorios de renovación</Link></div>} /><NotificationFilters search={search} /><Suspense key={JSON.stringify(search)} fallback={<NotificationSkeleton />}><History search={search} /></Suspense></div>;
}

import { Suspense } from "react";
import { ArrowRight, BellRing, CalendarClock, CircleAlert, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

import {
  AdminPageHeader,
  primaryActionClass,
  secondaryActionClass,
} from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationEmptyState, NotificationFilters, NotificationPagination, NotificationSkeleton } from "@/modules/notifications/components/NotificationPageParts";
import { notificationDate, notificationPreviewExcerpt, notificationTypeLabels } from "@/modules/notifications/domain/notifications";
import { getAdminNotifications, getAdminNotificationSenders, type NotificationSearch } from "@/server/notifications/queries";

const notificationVisuals = {
  GENERAL_ALERT: { icon: BellRing, className: "bg-secondary/10 text-secondary" },
  IMPORTANT_NOTICE: { icon: CircleAlert, className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  SUBSCRIPTION_RENEWAL: { icon: CalendarClock, className: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
} as const;

async function History({ search }: { search: NotificationSearch }) {
  const data = await getAdminNotifications(search);

  if (!data.items.length) {
    return <NotificationEmptyState title="No encontramos envíos" description="Prueba con otros términos o limpia los filtros para consultar el historial completo." />;
  }

  const firstItem = (data.page - 1) * 20 + 1;
  const lastItem = Math.min(data.page * 20, data.total);

  return (
    <section aria-labelledby="notification-history-heading" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 id="notification-history-heading" className="font-semibold text-foreground">Historial de envíos</h2>
          <p className="mt-0.5 text-sm text-muted">Mostrando {firstItem}–{lastItem} de {data.total}</p>
        </div>
        <span className="mt-2 w-fit rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted sm:mt-0">Solo canal interno</span>
      </div>

      <ul className="divide-y divide-border">
        {data.items.map(item => {
          const visual = notificationVisuals[item.type];
          const Icon = visual.icon;
          const deliveries = item._count.recipients;
          const readPercentage = deliveries ? Math.round((item.readCount / deliveries) * 100) : 0;

          return (
            <li key={item.id}>
              <Link href={`/dashboard/admin/notifications/${encodeURIComponent(item.id)}`} className="group grid gap-3 px-4 py-4 transition-colors hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:px-5 sm:py-5">
                <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-2xl ${visual.className}`}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-semibold text-foreground group-hover:text-secondary">{item.title}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${visual.className}`}>{notificationTypeLabels[item.type]}</span>
                  </span>
                  <span className="mt-1.5 block line-clamp-2 text-sm leading-6 text-muted">{notificationPreviewExcerpt(item.body)}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span className="font-medium text-foreground">{item.sentBy.name}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={item.sentAt.toISOString()}>{notificationDate(item.sentAt)}</time>
                  </span>
                </span>
                <span className="flex items-center justify-between gap-4 border-t border-border/70 pt-3 sm:block sm:min-w-36 sm:border-0 sm:pt-0 sm:text-right">
                  <span className="block text-sm font-semibold text-foreground">{item.readCount} de {deliveries} leídas</span>
                  <span className="mt-1 block text-xs text-muted">{readPercentage}% de lectura</span>
                  <ArrowRight aria-hidden="true" className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-secondary sm:ml-auto sm:mt-3" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-center border-t border-border px-4 py-3 sm:justify-end sm:px-5">
        <NotificationPagination pathname="/dashboard/admin/notifications" search={search} page={data.page} totalPages={data.totalPages} />
      </div>
    </section>
  );
}

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<NotificationSearch> }) {
  const [search, senders] = await Promise.all([searchParams, getAdminNotificationSenders()]);
  const resultsKey = [search.q, search.type, search.senderId, search.page].join(":");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <AdminPageHeader
        eyebrow="Comunicación interna"
        title="Gestionar notificaciones"
        description="Crea avisos para la comunidad y consulta su alcance y estado de lectura."
        breadcrumbs={[{ label: "Panel", href: "/dashboard/admin" }, { label: "Notificaciones" }]}
        actions={<>
          <Link href="/dashboard/admin/notifications/renewals" className={secondaryActionClass}><RefreshCw aria-hidden="true" className="size-4" />Renovaciones</Link>
          <Link href="/dashboard/admin/notifications/new" className={primaryActionClass}><Plus aria-hidden="true" className="size-4" />Nuevo aviso</Link>
        </>}
      />

      <NotificationFilters search={search} senders={senders.items} />
      <Suspense key={resultsKey} fallback={<NotificationSkeleton />}><History search={search} /></Suspense>
    </div>
  );
}

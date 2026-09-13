import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationComposer } from "@/modules/notifications/components/NotificationComposer";
export default async function RenewalNotificationsPage({ searchParams }: { searchParams: Promise<{ subscriptionId?: string }> }) {
  const { subscriptionId } = await searchParams;
  return <div className="mx-auto w-full max-w-6xl space-y-6 pb-8"><AdminPageHeader eyebrow="Comunicación interna" title="Recordatorios de renovación" description="Selecciona períodos vencidos o que terminan en los próximos siete días. Se excluyen cuentas no habilitadas, niveles incompatibles y cobros pendientes o en revisión." breadcrumbs={[{ label: "Panel", href: "/dashboard/admin" }, { label: "Notificaciones", href: "/dashboard/admin/notifications" }, { label: "Renovaciones" }]} /><NotificationComposer renewals initialId={typeof subscriptionId === "string" ? subscriptionId : ""} /></div>;
}

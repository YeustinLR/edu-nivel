import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationComposer } from "@/modules/notifications/components/NotificationComposer";
export default async function RenewalNotificationsPage({ searchParams }: { searchParams: Promise<{ subscriptionId?: string }> }) {
  const { subscriptionId } = await searchParams;
  return <div className="mx-auto max-w-4xl space-y-5"><AdminPageHeader title="Recordatorios de renovación" description="Períodos vencidos o que terminan en siete días. Se excluyen cuentas no habilitadas, reembolsos y niveles con un pago pendiente." breadcrumbs={[{ label: "Notificaciones", href: "/dashboard/admin/notifications" }, { label: "Renovaciones" }]} /><NotificationComposer renewals initialId={typeof subscriptionId === "string" ? subscriptionId : ""} /></div>;
}

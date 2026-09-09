import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationComposer } from "@/modules/notifications/components/NotificationComposer";
export default async function NewNotificationPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId } = await searchParams;
  return <div className="mx-auto max-w-4xl space-y-5"><AdminPageHeader title="Nuevo aviso" description="Envía una alerta general o un aviso importante a cuentas habilitadas." breadcrumbs={[{ label: "Notificaciones", href: "/dashboard/admin/notifications" }, { label: "Nuevo aviso" }]} /><NotificationComposer initialId={typeof userId === "string" ? userId : ""} /></div>;
}

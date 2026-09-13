import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { NotificationComposer } from "@/modules/notifications/components/NotificationComposer";
export default async function NewNotificationPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId } = await searchParams;
  return <div className="mx-auto w-full max-w-6xl space-y-6 pb-8"><AdminPageHeader eyebrow="Comunicación interna" title="Nuevo aviso" description="Redacta el mensaje, define quién debe recibirlo y revisa todo antes de enviarlo." breadcrumbs={[{ label: "Panel", href: "/dashboard/admin" }, { label: "Notificaciones", href: "/dashboard/admin/notifications" }, { label: "Nuevo aviso" }]} /><NotificationComposer initialId={typeof userId === "string" ? userId : ""} /></div>;
}

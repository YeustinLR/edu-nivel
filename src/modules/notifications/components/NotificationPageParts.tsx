import Link from "next/link";
import { AdminPagination } from "@/modules/dashboard/components/admin/AdminPagination";
import { notificationTypeLabels } from "@/modules/notifications/domain/notifications";

export function NotificationPagination({ pathname, search, page, totalPages }: { pathname: string; search: Record<string, unknown>; page: number; totalPages: number }) {
  function href(next: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) if (typeof value === "string" && ["type", "unread", "senderId", "recipientId"].includes(key)) params.set(key, value);
    params.set("page", String(next));
    return `${pathname}?${params}`;
  }
  return <AdminPagination page={page} totalPages={totalPages} previousHref={page > 1 ? href(page - 1) : undefined} nextHref={page < totalPages ? href(page + 1) : undefined} ariaLabel="Páginas de notificaciones" />;
}

export function NotificationFilters({ personal = false, search }: { personal?: boolean; search: Record<string, unknown> }) {
  return <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4">
    <label>Tipo<select name="type" defaultValue={typeof search.type === "string" ? search.type : ""} className="ml-2 min-h-11 rounded-lg border border-border bg-background px-3"><option value="">Todos</option>{Object.entries(notificationTypeLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
    {personal ? <label>Lectura<select name="unread" defaultValue={search.unread === "1" ? "1" : ""} className="ml-2 min-h-11 rounded-lg border border-border bg-background px-3"><option value="">Todas</option><option value="1">Sin leer</option></select></label> : <label>ID del emisor<input name="senderId" defaultValue={typeof search.senderId === "string" ? search.senderId : ""} maxLength={128} className="ml-2 min-h-11 rounded-lg border border-border bg-background px-3" /></label>}
    <button className="min-h-11 rounded-lg border border-border px-4 font-semibold">Filtrar</button>
    <Link href={personal ? "/dashboard/notifications" : "/dashboard/admin/notifications"} className="inline-flex min-h-11 items-center px-2 underline">Limpiar</Link>
  </form>;
}

export function NotificationSkeleton() {
  return <div role="status" className="min-h-48 rounded-xl border border-border p-5 text-muted">Cargando notificaciones…</div>;
}

import { Filter, SearchX } from "lucide-react";
import Link from "next/link";

import { AdminPagination } from "@/modules/dashboard/components/admin/AdminPagination";
import { AdminUrlSearchField } from "@/modules/dashboard/components/admin/AdminUrlSearchField";
import { AdminUrlSelectFilter } from "@/modules/dashboard/components/admin/AdminUrlSelectFilter";
import { notificationTypeLabels } from "@/modules/notifications/domain/notifications";

type SenderOption = { id: string; label: string };

const typeOptions = Object.entries(notificationTypeLabels).map(([value, label]) => ({ value, label }));
const readOptions = [{ value: "1", label: "Sin leer" }];

export function NotificationPagination({ pathname, search, page, totalPages }: { pathname: string; search: Record<string, unknown>; page: number; totalPages: number }) {
  function href(next: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) if (typeof value === "string" && ["q", "type", "unread", "senderId", "recipientId"].includes(key)) params.set(key, value);
    params.set("page", String(next));
    return `${pathname}?${params}`;
  }
  return <AdminPagination page={page} totalPages={totalPages} previousHref={page > 1 ? href(page - 1) : undefined} nextHref={page < totalPages ? href(page + 1) : undefined} ariaLabel="Páginas de notificaciones" />;
}

export function NotificationFilters({ personal = false, search, senders = [] }: { personal?: boolean; search: Record<string, unknown>; senders?: SenderOption[] }) {
  const type = typeof search.type === "string" ? search.type : undefined;
  const unread = search.unread === "1" ? "1" : undefined;
  const senderId = typeof search.senderId === "string" ? search.senderId : undefined;
  const query = typeof search.q === "string" ? search.q : "";
  const hasFilters = Boolean(type || unread || senderId || query);
  const clearHref = personal ? "/dashboard/notifications" : "/dashboard/admin/notifications";

  return (
    <section aria-label="Filtros de notificaciones" className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <Filter aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Filtrar notificaciones</h2>
            <p className="text-xs text-muted">Los resultados se actualizan automáticamente.</p>
          </div>
        </div>
        {hasFilters ? <Link href={clearHref} className="rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">Limpiar</Link> : null}
      </div>

      <div className={`grid gap-3 ${personal ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1.4fr)_1fr_1.2fr]"}`}>
        {!personal ? <AdminUrlSearchField parameter="q" initialValue={query} label="Buscar" placeholder="Título, mensaje o emisor" /> : null}
        <AdminUrlSelectFilter parameter="type" value={type} label="Tipo" allLabel="Todos los tipos" options={typeOptions} />
        {personal ? (
          <AdminUrlSelectFilter parameter="unread" value={unread} label="Estado" allLabel="Todas" options={readOptions} />
        ) : (
          <AdminUrlSelectFilter parameter="senderId" value={senderId} label="Enviado por" allLabel="Todos los emisores" options={senders.map(sender => ({ value: sender.id, label: sender.label }))} />
        )}
      </div>
    </section>
  );
}

export function NotificationEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
      <SearchX aria-hidden="true" className="mx-auto size-10 text-muted" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    </section>
  );
}

export function NotificationSkeleton() {
  return (
    <section role="status" aria-label="Cargando notificaciones" className="overflow-hidden rounded-2xl border border-border bg-card">
      <span className="sr-only">Cargando notificaciones</span>
      {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse border-b border-border bg-surface/60 last:border-0" />)}
    </section>
  );
}

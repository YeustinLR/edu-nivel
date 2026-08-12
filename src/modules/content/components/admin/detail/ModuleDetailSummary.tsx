import type { ReactNode } from "react";

import type { AdminModuleDetail } from "@/server/content/admin-content-queries";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Costa_Rica",
});

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-border py-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">
        {children}
      </dd>
    </div>
  );
}

export function ModuleDetailSummary({
  detail,
}: {
  detail: AdminModuleDetail;
}) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="module-summary-description">
        <h3
          id="module-summary-description"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-muted"
        >
          Descripción
        </h3>
        {detail.description ? (
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-[0.9375rem] leading-7 text-foreground-secondary">
            {detail.description}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">
            Este módulo todavía no tiene una descripción.
          </p>
        )}
      </section>

      <dl className="grid border-t border-border sm:grid-cols-2 sm:gap-x-10">
        <SummaryItem label="Autor">{detail.authorName}</SummaryItem>
        <SummaryItem label="Última actualización">
          <time dateTime={detail.updatedAt.toISOString()}>
            {dateFormatter.format(detail.updatedAt)}
          </time>
        </SummaryItem>
        <SummaryItem label="Disponibilidad">
          {detail.isActive ? "Activo" : "Archivado"}
        </SummaryItem>
        <SummaryItem label="Acceso">
          {detail.requiresSubscription
            ? "Requiere suscripción"
            : "Sin suscripción requerida"}
        </SummaryItem>
      </dl>
    </div>
  );
}

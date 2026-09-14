import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  CircleX,
  Clock3,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { PaymentStatus, ProviderMode } from "@/generated/prisma/client";
import {
  AdminPageHeader,
} from "@/modules/dashboard/components/admin/AdminPageHeader";
import { AdminPagination } from "@/modules/dashboard/components/admin/AdminPagination";
import { AdminUrlSearchField } from "@/modules/dashboard/components/admin/AdminUrlSearchField";
import { AdminUrlSelectFilter } from "@/modules/dashboard/components/admin/AdminUrlSelectFilter";
import {
  buildAdminPaymentsHref,
  type ParsedAdminPaymentsSearchParams,
} from "@/modules/payments/schemas/admin-payments.schema";
import type {
  AdminPaymentMetric,
  AdminPaymentsSummary,
} from "@/server/payments/admin-payment-queries";

const moneyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("es-CR");
const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Costa_Rica",
});
const monthFormatter = new Intl.DateTimeFormat("es-CR", {
  month: "short",
  year: "2-digit",
  timeZone: "America/Costa_Rica",
});

const planLabels = {
  STUDENT_MONTHLY: "Estudiante mensual",
  STUDENT_YEARLY: "Estudiante anual",
  TEACHER_MONTHLY: "Docente mensual",
  TEACHER_YEARLY: "Docente anual",
} as const;

const statusPresentation = {
  [PaymentStatus.INITIALIZING]: {
    label: "Iniciando",
    className: "bg-surface-elevated text-muted",
  },
  [PaymentStatus.PROCESSING]: {
    label: "Procesando",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  [PaymentStatus.SUCCEEDED]: {
    label: "Confirmado",
    className: "bg-success/10 text-success",
  },
  [PaymentStatus.REQUIRES_REVIEW]: {
    label: "Requiere revisión",
    className: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  [PaymentStatus.FAILED]: {
    label: "Fallido",
    className: "bg-danger/10 text-danger",
  },
  [PaymentStatus.CANCELED]: {
    label: "Cancelado",
    className: "bg-surface-elevated text-muted",
  },
} as const;

const statusOptions = Object.entries(statusPresentation).map(([value, item]) => ({
  value,
  label: item.label,
}));
const planOptions = Object.entries(planLabels).map(([value, label]) => ({
  value,
  label,
}));
const periodOptions = [
  { value: "30d", label: "Últimos 30 días" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "all", label: "Todo el historial" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Comparison({ metric }: { metric: AdminPaymentMetric }) {
  if (metric.previous === 0) {
    return (
      <span className="text-muted">
        {metric.current === 0
          ? "Sin actividad en ambos períodos"
          : "Sin base comparable el mes anterior"}
      </span>
    );
  }

  const percentage = metric.percentage ?? 0;
  const positive = percentage >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 ${positive ? "text-success" : "text-amber-700 dark:text-amber-300"}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {Math.abs(percentage).toFixed(0)}% {positive ? "más" : "menos"} frente al mismo corte del mes anterior
    </span>
  );
}

function CollectionTrend({ summary }: { summary: AdminPaymentsSummary }) {
  const largest = Math.max(
    1,
    ...summary.monthlyTrend.map((bucket) => bucket.amountMinor),
  );

  return (
    <section aria-labelledby="collection-trend-heading" className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Evolución</p>
        <h2 id="collection-trend-heading" className="mt-1 text-lg font-semibold text-foreground">Cobros de los últimos seis meses</h2>
      </div>
      <ol className="mt-5 space-y-3">
        {summary.monthlyTrend.map((bucket) => {
          const width = bucket.amountMinor === 0
            ? 0
            : Math.max(2, Math.round((bucket.amountMinor / largest) * 100));
          return (
            <li key={bucket.monthKey} className="grid gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_8rem] sm:items-center">
              <span className="text-xs font-medium capitalize text-muted">
                {monthFormatter.format(bucket.start)}{bucket.current ? " · en curso" : ""}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-elevated" aria-hidden="true">
                <span className="block h-full rounded-full bg-secondary" style={{ width: `${width}%` }} />
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground sm:text-right">
                {moneyFormatter.format(bucket.amountMinor / 100)}
                <span className="ml-1 block text-[11px] font-normal text-muted sm:inline">· {bucket.paymentCount} pagos</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function PlanBreakdown({ summary }: { summary: AdminPaymentsSummary }) {
  const largest = Math.max(
    1,
    ...summary.planBreakdown.map((item) => item.amountMinor),
  );

  return (
    <section aria-labelledby="plan-breakdown-heading" className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Composición</p>
        <h2 id="plan-breakdown-heading" className="mt-1 text-lg font-semibold text-foreground">Cobrado este mes por plan</h2>
      </div>
      <ul className="mt-5 space-y-4">
        {summary.planBreakdown.map((item) => {
          const width = item.amountMinor === 0
            ? 0
            : Math.max(2, Math.round((item.amountMinor / largest) * 100));
          return (
            <li key={item.planCode}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{planLabels[item.planCode]}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{moneyFormatter.format(item.amountMinor / 100)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-elevated" aria-hidden="true">
                <div className="h-full rounded-full bg-success-fill" style={{ width: `${width}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">{item.paymentCount} pagos confirmados</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AdminPaymentsOverview({
  summary,
  filters,
}: {
  summary: AdminPaymentsSummary;
  filters: ParsedAdminPaymentsSearchParams;
}) {
  const testMode = summary.paymentMode === ProviderMode.TEST;
  const collected = summary.metrics.collectedAmountMinor;
  const confirmed = summary.metrics.confirmedPayments;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-8">
      <AdminPageHeader
        eyebrow="Operación financiera"
        title="Cobros"
        description="Supervisa los cobros del mes y resuelve incidencias de conciliación con ONVO."
        breadcrumbs={[
          { label: "Panel", href: "/dashboard/admin" },
          { label: "Cobros" },
        ]}
        metadata={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className={`rounded-full px-3 py-1.5 font-semibold ${testMode ? "bg-amber-500/10 text-amber-800 dark:text-amber-200" : "bg-success/10 text-success"}`}>
              {testMode ? "Datos de prueba · ONVO TEST" : "ONVO LIVE"}
            </span>
            <span>Actualizado {dateFormatter.format(summary.generatedAt)}</span>
          </div>
        }
      />

      <section aria-label="Resumen de cobros" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">Cobrado este mes</p><CircleDollarSign aria-hidden="true" className="h-5 w-5 text-success" /></div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{moneyFormatter.format(collected.current / 100)}</p>
          <p className="mt-1 text-xs"><Comparison metric={collected} /></p>
          <p className="mt-2 text-xs text-muted">{confirmed.current} pagos confirmados</p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">Confirmados este mes</p><CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" /></div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{numberFormatter.format(confirmed.current)}</p>
          <p className="mt-1 text-xs"><Comparison metric={confirmed} /></p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">Requieren revisión</p><AlertTriangle aria-hidden="true" className="h-5 w-5 text-amber-700 dark:text-amber-300" /></div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{numberFormatter.format(summary.metrics.requiringReview)}</p>
          <Link href="/dashboard/admin/payments?status=REQUIRES_REVIEW&period=all" className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-secondary hover:underline">Ver incidencias pendientes</Link>
        </article>
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">Fallidos o cancelados</p><CircleX aria-hidden="true" className="h-5 w-5 text-muted" /></div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{numberFormatter.format(summary.metrics.failedOrCanceled)}</p>
          <p className="mt-1 text-xs text-muted">Intentos del mes sin acceso nuevo</p>
        </article>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <CollectionTrend summary={summary} />
        <PlanBreakdown summary={summary} />
      </div>

      <section aria-label="Filtros del historial" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminUrlSearchField parameter="q" initialValue={filters.query} label="Buscar" placeholder="Persona, pago o referencia" />
          <AdminUrlSelectFilter parameter="status" value={filters.status} label="Estado" allLabel="Todos los estados" options={statusOptions} />
          <AdminUrlSelectFilter parameter="plan" value={filters.plan} label="Plan" allLabel="Todos los planes" options={planOptions} />
          <AdminUrlSelectFilter parameter="period" value={filters.period === "90d" ? undefined : filters.period} label="Período" allLabel="Últimos 90 días" options={periodOptions} />
        </div>
      </section>

      <section aria-labelledby="payments-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Actividad reciente</p><h2 id="payments-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground">Historial operativo</h2></div>
          <span className="w-fit rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted">{numberFormatter.format(summary.history.totalItems)} resultados</span>
        </div>

        {summary.history.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <CreditCard aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm font-medium text-foreground">No hay cobros con estos filtros</p>
            <p className="mt-1 text-sm text-muted">Modifica la búsqueda, el período, el estado o el plan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.history.items.map((payment) => {
              const presentation = statusPresentation[payment.status as keyof typeof statusPresentation];
              const amountMinor = payment.receivedAmountMinor ?? payment.expectedAmountMinor;
              const needsReview = payment.status === PaymentStatus.REQUIRES_REVIEW;
              return (
                <article key={payment.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-sm font-bold text-secondary" aria-hidden="true">{initials(payment.user.name)}</div>
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{payment.user.name}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${presentation.className}`}>{presentation.label}</span></div><p className="mt-1 truncate text-sm text-muted">{payment.user.email}</p></div>
                    </div>
                    <div className="shrink-0 lg:text-right"><p className="text-lg font-semibold tabular-nums text-foreground">{moneyFormatter.format(amountMinor / 100)}</p><p className="mt-1 text-xs text-muted">{dateFormatter.format(payment.createdAt)}</p></div>
                  </div>
                  <dl className="mt-5 grid gap-3 border-t border-border/70 pt-4 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-muted">Nivel y plan</dt><dd className="mt-1 font-medium text-foreground">Nivel {payment.level.levelNumber} · {planLabels[payment.planCode]}</dd></div>
                    <div><dt className="text-muted">Payment ID</dt><dd className="mt-1 break-all font-mono text-foreground">{payment.id}</dd></div>
                    <div><dt className="text-muted">ONVO intent</dt><dd className="mt-1 break-all font-mono text-foreground">{payment.providerPaymentIntentId ?? "Sin asignar"}</dd></div>
                    <div><dt className="text-muted">Estado ONVO</dt><dd className="mt-1 break-all font-mono text-foreground">{payment.providerStatus ?? "Sin informar"}</dd></div>
                  </dl>
                  {needsReview ? (
                    <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                      <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                      <div><p className="font-semibold">Incidencia de conciliación</p><p className="mt-1 break-words">{payment.errorCode ? <span className="font-mono">{payment.errorCode}: </span> : null}{payment.errorMessage ?? "El pago necesita investigación administrativa antes de continuar."}</p>{payment.appliedAt ? <p className="mt-2 text-xs">El período que ya había sido aplicado se conserva mientras se investiga la incidencia.</p> : null}</div>
                    </div>
                  ) : payment.status === PaymentStatus.PROCESSING || payment.status === PaymentStatus.INITIALIZING ? (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-900 dark:text-blue-100"><Clock3 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p>ONVO todavía está procesando este intento. La conciliación automática actualizará su estado.</p></div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {summary.history.totalPages > 1 ? (
          <div className="flex justify-center pt-2">
            <AdminPagination
              page={summary.history.page}
              totalPages={summary.history.totalPages}
              previousHref={summary.history.page > 1 ? buildAdminPaymentsHref(filters, summary.history.page - 1) : undefined}
              nextHref={summary.history.page < summary.history.totalPages ? buildAdminPaymentsHref(filters, summary.history.page + 1) : undefined}
              ariaLabel="Paginación del historial de cobros"
            />
          </div>
        ) : null}
      </section>

      <aside className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>Los valores corresponden a cobros confirmados del entorno ONVO configurado. No representan MRR ni reconocimiento contable de ingresos.</p>
      </aside>
    </div>
  );
}

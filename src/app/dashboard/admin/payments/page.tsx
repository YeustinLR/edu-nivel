import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

import { PaymentStatus, ProviderMode } from "@/generated/prisma/client";
import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { getAdminPaymentsSummary } from "@/server/payments/admin-payment-queries";

const moneyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Costa_Rica",
});

const statusPresentation = {
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function AdminPaymentsPage() {
  const summary = await getAdminPaymentsSummary();
  const testMode = summary.paymentMode === ProviderMode.TEST;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-8">
      <AdminPageHeader
        eyebrow="Operación financiera"
        title="Cobros"
        description="Supervisa pagos confirmados y resuelve incidencias de conciliación con ONVO."
        breadcrumbs={[
          { label: "Panel", href: "/dashboard/admin" },
          { label: "Cobros" },
        ]}
        metadata={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span
              className={`rounded-full px-3 py-1.5 font-semibold ${
                testMode
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : "bg-success/10 text-success"
              }`}
            >
              {testMode ? "Datos de prueba · ONVO TEST" : "ONVO LIVE"}
            </span>
            <span>Actualizado {dateFormatter.format(summary.generatedAt)}</span>
          </div>
        }
      />

      <section aria-label="Resumen de cobros" className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Pagos confirmados",
            value: summary.counts.confirmed,
            note: "Confirmados en el modo actual",
            icon: CheckCircle2,
            tone: "text-success",
          },
          {
            label: "Requieren revisión",
            value: summary.counts.requiringReview,
            note: "Incidencias pendientes de investigación",
            icon: AlertTriangle,
            tone: "text-amber-700 dark:text-amber-300",
          },
          {
            label: "Fallidos o cancelados",
            value: summary.counts.failedOrCanceled,
            note: "Resultados terminales sin acceso nuevo",
            icon: CircleX,
            tone: "text-muted",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted">{item.label}</p>
                <Icon aria-hidden="true" className={`h-5 w-5 ${item.tone}`} />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-muted">{item.note}</p>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="payments-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Actividad reciente</p>
            <h2 id="payments-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground">Historial operativo</h2>
          </div>
          <span className="rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted">
            Últimos {summary.payments.length} registros
          </span>
        </div>

        {summary.payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <CreditCard aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm font-medium text-foreground">Aún no hay cobros para mostrar</p>
            <p className="mt-1 text-sm text-muted">Los resultados de pago del modo actual aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.payments.map((payment) => {
              const presentation = statusPresentation[payment.status as keyof typeof statusPresentation];
              const amountMinor = payment.receivedAmountMinor ?? payment.expectedAmountMinor;
              const needsReview = payment.status === PaymentStatus.REQUIRES_REVIEW;

              return (
                <article key={payment.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-sm font-bold text-secondary" aria-hidden="true">
                        {initials(payment.user.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{payment.user.name}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${presentation.className}`}>
                            {presentation.label}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted">{payment.user.email}</p>
                      </div>
                    </div>
                    <div className="shrink-0 lg:text-right">
                      <p className="text-lg font-semibold tabular-nums text-foreground">
                        {moneyFormatter.format(amountMinor / 100)}
                      </p>
                      <p className="mt-1 text-xs text-muted">{dateFormatter.format(payment.createdAt)}</p>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 border-t border-border/70 pt-4 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-muted">Nivel y plan</dt><dd className="mt-1 font-medium text-foreground">Nivel {payment.level.levelNumber} · {payment.planCode}</dd></div>
                    <div><dt className="text-muted">Payment ID</dt><dd className="mt-1 break-all font-mono text-foreground">{payment.id}</dd></div>
                    <div><dt className="text-muted">ONVO intent</dt><dd className="mt-1 break-all font-mono text-foreground">{payment.providerPaymentIntentId ?? "Sin asignar"}</dd></div>
                    <div><dt className="text-muted">Estado ONVO</dt><dd className="mt-1 break-all font-mono text-foreground">{payment.providerStatus ?? "Sin informar"}</dd></div>
                  </dl>

                  {needsReview ? (
                    <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                      <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Incidencia de conciliación</p>
                        <p className="mt-1 break-words">
                          {payment.errorCode ? <span className="font-mono">{payment.errorCode}: </span> : null}
                          {payment.errorMessage ?? "El pago necesita investigación administrativa antes de continuar."}
                        </p>
                        {payment.appliedAt ? <p className="mt-2 text-xs">El período que ya había sido aplicado se conserva mientras se investiga la incidencia.</p> : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

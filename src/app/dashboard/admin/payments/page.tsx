import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { PaymentStatus, RefundStatus } from "@/generated/prisma/client";
import {
  cancelManualRefundAction,
  createManualRefundCaseAction,
  reconcileManualRefundAction,
  registerManualRefundAction,
} from "@/modules/payments/actions/admin-refund-actions";
import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { prisma } from "@/server/db/prisma";

const successMessages: Record<string, string> = {
  REFUND_CASE_CANCELED: "Preparación cancelada. El pago sigue disponible.",
  REFUND_CASE_CREATED: "Preparación creada. Ejecuta el reembolso total en ONVO y registra su refundId.",
  REFUND_PENDING: "ONVO todavía está procesando el reembolso.",
  REFUND_SUCCEEDED: "Reembolso confirmado y acceso recalculado correctamente.",
  REFUND_FAILED: "ONVO informó que el reembolso falló; el acceso no cambió.",
  REFUND_REQUIRES_REVIEW: "El reembolso requiere revisión.",
  REFUND_ALREADY_APPLIED: "El reembolso ya se había aplicado; no hubo cambios.",
};

const errorMessages: Record<string, string> = {
  INVALID_REFUND_DATA: "Revisa los datos enviados.",
  PAYMENT_NOT_FOUND: "No se encontró el pago.",
  PAYMENT_NOT_REFUNDABLE: "El pago no cumple las condiciones para reembolso.",
  REFUND_CASE_NOT_FOUND: "No se encontró el caso de reembolso.",
  REFUND_ID_REQUIRED: "Debes registrar el refundId mostrado por ONVO.",
  REFUND_ID_CONFLICT: "El caso ya está asociado a otro refundId.",
  REFUND_OPERATION_FAILED: "No se pudo verificar el reembolso.",
  REFUND_CASE_NOT_CANCELABLE: "El proceso de reembolso ya avanzó y no se puede cancelar.",
};

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amountMinor / 100);
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" }).format(value);
}

function initials(name: string | null) {
  return (name ?? "Usuario").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function paymentStatus(status: PaymentStatus) {
  return ({ SUCCEEDED: "Confirmado", REFUNDED: "Reembolsado", REQUIRES_REVIEW: "Revisión requerida" } as Partial<Record<PaymentStatus, string>>)[status] ?? status;
}

function refundStatus(status: RefundStatus) {
  return ({ REQUESTED: "Preparación pendiente", PENDING: "En proceso en ONVO", SUCCEEDED: "Reembolso aplicado", FAILED: "Reembolso fallido", REQUIRES_REVIEW: "Requiere revisión", CANCELED: "Preparación cancelada" } as Record<RefundStatus, string>)[status];
}

function paymentBadge(status: PaymentStatus) {
  return status === PaymentStatus.SUCCEEDED ? "bg-success/10 text-success" : status === PaymentStatus.REFUNDED ? "bg-secondary/10 text-secondary" : "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function refundBadge(status: RefundStatus) {
  return status === RefundStatus.SUCCEEDED ? "bg-success/10 text-success" : status === RefundStatus.CANCELED || status === RefundStatus.FAILED ? "bg-surface-elevated text-muted" : "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export default async function AdminPaymentsPage({
  searchParams,
}: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const payments = await prisma.payment.findMany({
    where: { status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED, PaymentStatus.REQUIRES_REVIEW] } },
    include: { user: { select: { name: true, email: true } }, level: { select: { levelNumber: true } }, refunds: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  const successMessage = params.success ? successMessages[params.success] : null;
  const errorMessage = params.error ? (errorMessages[params.error] ?? errorMessages.REFUND_OPERATION_FAILED) : null;
  const pending = payments.filter((payment) => {
    const status = payment.refunds[0]?.status;
    return status === RefundStatus.REQUESTED || status === RefundStatus.PENDING || status === RefundStatus.REQUIRES_REVIEW;
  });
  const refunded = payments.filter((payment) => payment.status === PaymentStatus.REFUNDED);
  const confirmed = payments.filter((payment) => payment.status === PaymentStatus.SUCCEEDED);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-8">
      <AdminPageHeader eyebrow="Operaciones financieras" title="Cobros" description="Supervisa pagos de suscripciones y gestiona reembolsos confirmados por ONVO." breadcrumbs={[{ label: "Panel", href: "/dashboard/admin" }, { label: "Cobros" }]} />

      {successMessage ? <div role="status" className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><p>{successMessage}</p></div> : null}
      {errorMessage ? <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><p>{errorMessage}</p></div> : null}

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-6 bg-gradient-to-br from-secondary/[0.12] via-card to-card p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Conciliación segura</div>
            <h2 className="max-w-xl text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Cada reembolso se confirma con ONVO antes de cambiar el acceso.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">EduNivel no reembolsa directamente. Prepara el caso aquí, realiza el reembolso total en ONVO y registra el refundId para verificarlo.</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Flujo de trabajo</p><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">{[["01", "Preparar"], ["02", "Reembolsar"], ["03", "Verificar"]].map(([number, label], index) => <div key={number} className="relative"><div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">{number}</div><p className="mt-2 text-muted">{label}</p>{index < 2 ? <ArrowRight className="absolute -right-3 top-2 h-4 w-4 text-border" aria-hidden="true" /> : null}</div>)}</div></div>
        </div>
      </section>

      <section aria-label="Resumen de cobros" className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Pagos confirmados", value: confirmed.length, note: "Últimos 50 registros", icon: CreditCard, color: "text-secondary" }, { label: "Reembolsos por atender", value: pending.length, note: "Pendientes o en revisión", icon: Clock3, color: "text-amber-600" }, { label: "Reembolsados", value: refunded.length, note: "Accesos recalculados", icon: CheckCircle2, color: "text-success" }].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted">{item.label}</p><Icon className={`h-4 w-4 ${item.color}`} aria-hidden="true" /></div><p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p><p className="mt-1 text-xs text-muted">{item.note}</p></div>; })}
      </section>

      <section aria-labelledby="payments-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Actividad reciente</p><h2 id="payments-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground">Pagos y reembolsos</h2></div><span className="rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted">{payments.length} registros</span></div>
        {payments.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><CreditCard className="mx-auto h-8 w-8 text-muted" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Aún no hay pagos para mostrar</p><p className="mt-1 text-sm text-muted">Los pagos confirmados aparecerán aquí.</p></div> : <div className="space-y-3">{payments.map((payment) => {
          const refund = payment.refunds[0] ?? null;
          const canCreate = payment.status === PaymentStatus.SUCCEEDED && (!refund || refund.status === RefundStatus.FAILED || refund.status === RefundStatus.CANCELED);
          const needsId = refund && !refund.providerRefundId && (refund.status === RefundStatus.REQUESTED || refund.status === RefundStatus.REQUIRES_REVIEW);
          const canReconcile = refund?.providerRefundId && (refund.status === RefundStatus.PENDING || refund.status === RefundStatus.REQUIRES_REVIEW);
          return <article key={payment.id} className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm sm:p-5"><div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0 flex-1"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-sm font-bold text-secondary">{initials(payment.user.name)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{payment.user.name ?? "Usuario sin nombre"}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentBadge(payment.status)}`}>{paymentStatus(payment.status)}</span>{refund ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${refundBadge(refund.status)}`}>{refundStatus(refund.status)}</span> : null}</div><p className="mt-1 truncate text-sm text-muted">{payment.user.email}</p></div><div className="shrink-0 text-right"><p className="text-lg font-semibold tabular-nums text-foreground">{money(payment.expectedAmountMinor, payment.currency)}</p><p className="mt-1 text-xs text-muted">{dateTime(payment.createdAt)}</p></div></div><dl className="mt-5 grid gap-3 border-t border-border/70 pt-4 text-xs sm:grid-cols-3"><div><dt className="text-muted">Producto</dt><dd className="mt-1 font-medium text-foreground">Nivel {payment.level.levelNumber} · {payment.planCode}</dd></div><div><dt className="text-muted">Payment ID</dt><dd className="mt-1 truncate font-mono text-foreground" title={payment.id}>{payment.id}</dd></div><div><dt className="text-muted">ONVO intent</dt><dd className="mt-1 truncate font-mono text-foreground">{payment.providerPaymentIntentId ?? "Sin asignar"}</dd></div></dl>{refund?.providerRefundId ? <p className="mt-3 text-xs text-muted">Refund ID: <span className="font-mono text-foreground">{refund.providerRefundId}</span></p> : null}{refund?.errorMessage && refund.status !== RefundStatus.CANCELED ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{refund.errorMessage}</p> : null}</div>
            <div className="w-full border-t border-border/70 pt-4 xl:w-72 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">{canCreate ? <div className="space-y-3"><p className="text-xs leading-5 text-muted">{refund?.status === RefundStatus.CANCELED ? "La preparación anterior fue cancelada. Puedes iniciar una nueva si es necesario." : "Solo inicia este proceso si ya aprobaste el reembolso del usuario."}</p><form action={createManualRefundCaseAction}><input type="hidden" name="paymentId" value={payment.id} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-elevated"><RotateCcw className="h-4 w-4" aria-hidden="true" />Preparar reembolso total</button></form></div> : null}{needsId ? <div className="space-y-3"><div className="rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200"><p className="font-semibold">Acción requerida</p><p className="mt-1">Realiza el reembolso en ONVO y registra el ID.</p></div>{refund.status === RefundStatus.REQUESTED ? <form action={cancelManualRefundAction}><input type="hidden" name="refundCaseId" value={refund.id} /><button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:border-danger/30 hover:bg-danger/5 hover:text-danger"><XCircle className="h-4 w-4" aria-hidden="true" />Cancelar preparación</button></form> : null}<form action={registerManualRefundAction} className="space-y-2"><label className="block text-xs font-medium text-foreground" htmlFor={`refund-${refund.id}`}>refundId de ONVO</label><input id={`refund-${refund.id}`} name="providerRefundId" required autoComplete="off" placeholder="Ej. re_abc123" className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20" /><input type="hidden" name="refundCaseId" value={refund.id} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/90">Verificar con ONVO</button></form></div> : null}{canReconcile ? <form action={reconcileManualRefundAction}><input type="hidden" name="refundCaseId" value={refund.id} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-elevated"><RefreshCw className="h-4 w-4" aria-hidden="true" />Consultar estado en ONVO</button></form> : null}{refund?.status === RefundStatus.SUCCEEDED ? <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-3 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Reembolso aplicado</div> : null}{refund?.status === RefundStatus.CANCELED ? <div className="flex items-center gap-2 rounded-xl bg-surface-elevated px-3 py-3 text-xs font-medium text-muted"><XCircle className="h-4 w-4" aria-hidden="true" />Sin reembolso activo</div> : null}</div>
          </div></article>;
        })}</div>}
      </section>
    </div>
  );
}

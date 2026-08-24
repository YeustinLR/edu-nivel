import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import Link from "next/link";

import { formatCRC } from "@/lib/currency";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import { amountMinorToCRC } from "@/modules/subscriptions/config/plan-catalog";
import {
  formatSubscriptionDate,
  getPaymentMethodLabel,
  getPlanIntervalLabel,
  paymentStatusPresentation,
} from "@/modules/subscriptions/lib/learner-subscription-presentation";
import type { LearnerPaymentHistory } from "@/modules/subscriptions/types/learner-subscription";

const toneClass = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  neutral: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
} as const;

function PaymentBadge({ status }: { status: keyof typeof paymentStatusPresentation }) {
  const item = paymentStatusPresentation[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClass[item.tone]}`}>{item.label}</span>;
}

function pageHref(page: number) {
  return `/dashboard/subscription?paymentPage=${page}#payment-history`;
}

export function PaymentHistory({ history }: { history: LearnerPaymentHistory }) {
  return (
    <section id="payment-history" aria-labelledby="payment-history-heading" className="overflow-hidden rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--subscription-border)] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <ReceiptText aria-hidden="true" className="h-4.5 w-4.5 shrink-0 text-[var(--subscription-accent)]" />
          <h2 id="payment-history-heading" className="font-semibold text-[var(--subscription-text)]">Historial de pagos</h2>
          <p className="hidden text-xs text-[var(--subscription-muted)] sm:block">
            {history.totalItems === 0 ? "Todavía no hay operaciones." : `${history.totalItems} ${history.totalItems === 1 ? "operación" : "operaciones"}`}
          </p>
        </div>
        {history.totalItems > 0 ? <span className="text-xs tabular-nums text-[var(--subscription-muted)] sm:hidden">{history.totalItems}</span> : null}
      </header>

      {history.items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm font-medium text-[var(--subscription-text)]">Sin pagos registrados</p>
          <p className="mt-1 text-xs text-[var(--subscription-muted)]">Tus operaciones aparecerán aquí cuando realices una compra.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--subscription-bg)] text-xs font-medium text-[var(--subscription-muted)]">
                <tr>
                  <th className="px-4 py-2.5" scope="col">Fecha</th>
                  <th className="px-4 py-2.5" scope="col">Detalle</th>
                  <th className="px-4 py-2.5 text-right" scope="col">Monto</th>
                  <th className="px-4 py-2.5 text-right" scope="col">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--subscription-border)]">
                {history.items.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--subscription-muted)]">{formatSubscriptionDate(payment.confirmedAt ?? payment.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={payment.href} className="font-semibold text-[var(--subscription-text)] hover:text-[var(--subscription-accent)]">
                        {getPlanIntervalLabel(payment.planCode)} · {formatLearnerLevel(payment.levelNumber)}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--subscription-muted)]">{getPaymentMethodLabel(payment.method)}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[var(--subscription-text)]">{formatCRC(amountMinorToCRC(payment.receivedAmountMinor ?? payment.expectedAmountMinor))}</td>
                    <td className="px-4 py-3 text-right"><PaymentBadge status={payment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-[var(--subscription-border)] md:hidden">
            {history.items.map((payment) => (
              <li key={payment.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={payment.href} className="text-sm font-semibold text-[var(--subscription-text)]">
                      {getPlanIntervalLabel(payment.planCode)} · {formatLearnerLevel(payment.levelNumber)}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--subscription-muted)]">{formatSubscriptionDate(payment.confirmedAt ?? payment.createdAt)} · {getPaymentMethodLabel(payment.method)}</p>
                  </div>
                  <PaymentBadge status={payment.status} />
                </div>
                <p className="mt-2 text-sm font-semibold tabular-nums text-[var(--subscription-text)]">{formatCRC(amountMinorToCRC(payment.receivedAmountMinor ?? payment.expectedAmountMinor))}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {history.totalPages > 1 ? (
        <nav aria-label="Paginación del historial" className="flex items-center justify-between gap-3 border-t border-[var(--subscription-border)] px-4 py-3">
          {history.page > 1 ? (
            <Link href={pageHref(history.page - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--subscription-border)] px-3 text-sm font-semibold text-[var(--subscription-text)] hover:bg-[var(--subscription-soft)]"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Anterior</Link>
          ) : <span />}
          <span className="text-xs text-[var(--subscription-muted)]">{history.page} de {history.totalPages}</span>
          {history.page < history.totalPages ? (
            <Link href={pageHref(history.page + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--subscription-border)] px-3 text-sm font-semibold text-[var(--subscription-text)] hover:bg-[var(--subscription-soft)]">Siguiente<ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
          ) : <span />}
        </nav>
      ) : null}
    </section>
  );
}

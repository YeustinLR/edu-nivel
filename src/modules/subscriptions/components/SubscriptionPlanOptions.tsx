import { ArrowUpRight, CalendarRange, Info } from "lucide-react";
import Link from "next/link";

import { formatCRC } from "@/lib/currency";
import {
  amountMinorToCRC,
  getSubscriptionPlansForRole,
} from "@/modules/subscriptions/config/plan-catalog";
import type {
  LearnerSubscriptionItem,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";

export function SubscriptionPlanOptions({
  subscription,
  role,
}: {
  subscription: LearnerSubscriptionItem;
  role: LearnerSubscriptionRole;
}) {
  const plans = getSubscriptionPlansForRole(role);

  return (
    <section
      aria-labelledby="access-options-heading"
      className="overflow-hidden rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)]"
    >
      <header className="border-b border-[var(--subscription-border)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <CalendarRange
            aria-hidden="true"
            className="h-4.5 w-4.5 text-[var(--subscription-accent)]"
          />
          <h2
            id="access-options-heading"
            className="font-semibold text-[var(--subscription-text)]"
          >
            {subscription.canRenew ? "Extender acceso" : "Modalidades de acceso"}
          </h2>
        </div>
        <p className="mt-1 text-sm text-[var(--subscription-muted)]">
          {subscription.canRenew
            ? "El tiempo que compres se suma a la vigencia actual."
            : "Opciones disponibles para este tipo de acceso."}
        </p>
      </header>

      <div className="divide-y divide-[var(--subscription-border)]">
        {plans.map((plan) => {
          const current = subscription.lastPlanCode === plan.code;
          const interval =
            plan.billingInterval === "MONTHLY" ? "Mensual" : "Anual";

          return (
            <div
              key={plan.code}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--subscription-text)]">
                    {interval}
                  </h3>
                  {current ? (
                    <span className="rounded-md bg-[var(--subscription-accent-soft)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--subscription-accent)]">
                      Última modalidad
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-bold tabular-nums text-[var(--subscription-text)]">
                  {formatCRC(amountMinorToCRC(plan.amountMinor))}
                  <span className="ml-1 text-xs font-normal text-[var(--subscription-muted)]">
                    / {plan.durationMonths === 1 ? "1 mes" : "12 meses"}
                  </span>
                </p>
              </div>

              {subscription.canRenew && !subscription.openPayment ? (
                <Link
                  href={`/dashboard/subscription/renew/${encodeURIComponent(subscription.id)}?plan=${encodeURIComponent(plan.code)}`}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--subscription-accent)] transition-colors hover:bg-[var(--subscription-accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--subscription-accent)]"
                >
                  {current ? "Extender" : "Elegir"}
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-2 border-t border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-5 py-3 text-xs leading-4 text-[var(--subscription-muted)]">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Ninguna modalidad se renueva automáticamente.
      </p>
    </section>
  );
}

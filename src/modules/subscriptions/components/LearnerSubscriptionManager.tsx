import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  GraduationCap,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { Role } from "@/generated/prisma/enums";
import { formatCRC } from "@/lib/currency";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import { OtherSubscriptionLevels } from "@/modules/subscriptions/components/OtherSubscriptionLevels";
import { PaymentHistory } from "@/modules/subscriptions/components/PaymentHistory";
import { SubscriptionOverview } from "@/modules/subscriptions/components/SubscriptionOverview";
import { SubscriptionPlanOptions } from "@/modules/subscriptions/components/SubscriptionPlanOptions";
import { amountMinorToCRC } from "@/modules/subscriptions/config/plan-catalog";
import {
  getPlanIntervalLabel,
  getPrimarySubscription,
} from "@/modules/subscriptions/lib/learner-subscription-presentation";
import type {
  LearnerSubscriptionOverview,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";
import { learnerCheckoutErrorMessages } from "@/modules/subscriptions/types/learner-checkout-action-state";

const pendingStatusLabels = {
  INITIALIZING: "Preparando la solicitud",
  PROCESSING: "Esperando confirmación",
  REQUIRES_REVIEW: "Requiere revisión",
} as const;

function PendingPayments({
  payments,
}: {
  payments: LearnerSubscriptionOverview["pendingPayments"];
}) {
  if (payments.length === 0) return null;

  return (
    <section
      aria-labelledby="pending-payments-heading"
      className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-500/10"
    >
      <div className="flex items-center gap-2 border-b border-amber-200/80 px-4 py-2.5 text-amber-900 dark:border-amber-400/15 dark:text-amber-200">
        <Clock3 aria-hidden="true" className="h-4 w-4" />
        <h2 id="pending-payments-heading" className="text-sm font-semibold">
          Pagos en proceso
        </h2>
      </div>
      <div className="divide-y divide-amber-200/80 dark:divide-amber-400/15">
        {payments.map((payment) => (
          <article
            key={payment.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--subscription-text)]">
                {formatLearnerLevel(payment.levelNumber)} ·{" "}
                {getPlanIntervalLabel(payment.planCode)}
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-[var(--subscription-muted)]">
                {pendingStatusLabels[payment.status]} ·{" "}
                {formatCRC(amountMinorToCRC(payment.expectedAmountMinor))}. No
                inicies otro pago para este nivel.
              </p>
            </div>
            <Link
              href={payment.href}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white/70 px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
            >
              Continuar
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptySubscription({
  availableLevelCount,
}: {
  availableLevelCount: number;
}) {
  return (
    <section className="grid items-center gap-5 rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)] p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--subscription-accent-soft)] text-[var(--subscription-accent)]">
        <GraduationCap aria-hidden="true" className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-semibold text-[var(--subscription-text)]">
          Aún no tienes una suscripción
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--subscription-muted)]">
          Elige un nivel y compra uno o doce meses de acceso. Es un pago único y
          podrás extenderlo cuando lo necesites.
        </p>
      </div>
      {availableLevelCount > 0 ? (
        <Link
          href="/dashboard/subscription/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--subscription-accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--subscription-accent)]"
        >
          Elegir un nivel
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ) : null}
    </section>
  );
}

export function LearnerSubscriptionManager({
  data,
  role,
  error,
}: {
  data: LearnerSubscriptionOverview;
  role: LearnerSubscriptionRole;
  error?: string;
}) {
  const themeClass =
    role === Role.STUDENT
      ? "student-subscription-theme"
      : "teacher-subscription-theme";
  const primarySubscription = getPrimarySubscription(data.subscriptions);
  const otherSubscriptions = primarySubscription
    ? data.subscriptions.filter((item) => item.id !== primarySubscription.id)
    : [];
  const acquiredLevelIds = new Set(
    data.subscriptions.map((item) => item.level.id),
  );
  const pendingNewLevels = data.pendingPayments.filter(
    (payment) => !acquiredLevelIds.has(payment.levelId),
  );

  return (
    <div className={`${themeClass} space-y-5`}>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.035em] text-[var(--subscription-text)] sm:text-[1.75rem]">
            Mi suscripción
          </h1>
          <p className="mt-1 text-sm text-[var(--subscription-muted)]">
            Consulta y administra el acceso a tus niveles.
          </p>
        </div>
        {primarySubscription && data.availableLevelCount > 0 ? (
          <Link
            href="/dashboard/subscription/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--subscription-border)] bg-[var(--subscription-panel)] px-3.5 text-sm font-semibold text-[var(--subscription-text)] transition-colors hover:bg-[var(--subscription-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--subscription-accent)]"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Adquirir otro nivel
          </Link>
        ) : null}
      </header>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>
            {learnerCheckoutErrorMessages[error] ??
              "No fue posible completar la operación."}
          </p>
        </div>
      ) : null}

      <PendingPayments payments={pendingNewLevels} />

      {primarySubscription ? (
        <>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
            <SubscriptionOverview item={primarySubscription} role={role} />
            <SubscriptionPlanOptions
              subscription={primarySubscription}
              role={role}
            />
          </div>
          <OtherSubscriptionLevels items={otherSubscriptions} role={role} />
        </>
      ) : (
        <EmptySubscription availableLevelCount={data.availableLevelCount} />
      )}

      <PaymentHistory history={data.paymentHistory} />
    </div>
  );
}

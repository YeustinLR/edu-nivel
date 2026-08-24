import {
  ArrowRight,
  CalendarDays,
  Clock3,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

import { Role } from "@/generated/prisma/enums";
import { formatCRC } from "@/lib/currency";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import {
  selectStudentSubscriptionLevelAction,
  selectTeacherSubscriptionLevelAction,
} from "@/modules/subscriptions/actions/learner-subscription-actions";
import { SubscriptionStatusBadge } from "@/modules/subscriptions/components/SubscriptionStatusBadge";
import { amountMinorToCRC } from "@/modules/subscriptions/config/plan-catalog";
import {
  formatSubscriptionDate,
  getPaymentMethodLabel,
  getPlanIntervalLabel,
} from "@/modules/subscriptions/lib/learner-subscription-presentation";
import type {
  LearnerSubscriptionItem,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";

function getAccessMessage(item: LearnerSubscriptionItem) {
  const endDate = formatSubscriptionDate(item.currentPeriodEnd);

  if (item.effectiveStatus === "CANCELED") {
    return item.canStudy
      ? `Este acceso fue cancelado, pero puedes seguir estudiando hasta el ${endDate}.`
      : `Este acceso fue cancelado y finalizó el ${endDate}.`;
  }
  if (item.effectiveStatus === "EXPIRED") {
    return `Tu acceso finalizó el ${endDate}. Puedes renovarlo cuando lo necesites.`;
  }
  if (item.effectiveStatus === "REFUNDED") {
    return "El pago fue reembolsado y este nivel ya no tiene acceso.";
  }
  if (item.effectiveStatus === "INACTIVE") {
    return "Este nivel no está disponible actualmente.";
  }

  return `Tu acceso está disponible hasta el ${endDate}.`;
}

function SubscriptionAction({
  item,
  role,
}: {
  item: LearnerSubscriptionItem;
  role: LearnerSubscriptionRole;
}) {
  const selectAction =
    role === Role.STUDENT
      ? selectStudentSubscriptionLevelAction
      : selectTeacherSubscriptionLevelAction;
  const contentHref =
    role === Role.STUDENT
      ? "/dashboard/student/content"
      : "/dashboard/teacher/content";
  const primaryClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--subscription-accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--subscription-accent)] sm:w-auto";

  if (item.openPayment) {
    return (
      <Link href={item.openPayment.href} className={primaryClass}>
        <Clock3 aria-hidden="true" className="h-4 w-4" />
        Continuar pago
      </Link>
    );
  }

  if (item.canStudy && item.isSelectedLevel) {
    return (
      <Link href={contentHref} className={primaryClass}>
        Entrar al nivel
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    );
  }

  if (item.canStudy) {
    return (
      <form action={selectAction}>
        <input type="hidden" name="subscriptionId" value={item.id} />
        <button type="submit" className={primaryClass}>
          Entrar al nivel
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
    );
  }

  if (item.canRenew) {
    return (
      <Link
        href={`/dashboard/subscription/renew/${encodeURIComponent(item.id)}`}
        className={primaryClass}
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        Renovar acceso
      </Link>
    );
  }

  return null;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <dt className="text-xs font-medium text-[var(--subscription-muted)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold text-[var(--subscription-text)]">
        {value}
      </dd>
    </div>
  );
}

export function SubscriptionOverview({
  item,
  role,
}: {
  item: LearnerSubscriptionItem;
  role: LearnerSubscriptionRole;
}) {
  const latestPayment = item.latestPayment;
  const paidAmount = latestPayment
    ? formatCRC(
        amountMinorToCRC(
          latestPayment.receivedAmountMinor ?? latestPayment.expectedAmountMinor,
        ),
      )
    : "No disponible";
  const interval = item.lastPlanCode
    ? getPlanIntervalLabel(item.lastPlanCode)
    : "No registrada";

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--subscription-muted)]">
              Suscripción actual
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-[var(--subscription-text)] sm:text-[1.7rem]">
                {formatLearnerLevel(item.level.levelNumber)}
              </h2>
              <SubscriptionStatusBadge status={item.effectiveStatus} />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--subscription-muted)]">
              {getAccessMessage(item)}
            </p>
          </div>

          <div className="shrink-0">
            <SubscriptionAction item={item} role={role} />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] sm:grid-cols-4 sm:[&>div+div]:border-l [&>div:nth-child(even)]:border-l [&>div:nth-child(n+3)]:border-t sm:[&>div:nth-child(n+3)]:border-t-0">
          <Detail label="Modalidad" value={interval} />
          <Detail
            label={item.canStudy ? "Acceso hasta" : "Fecha de finalización"}
            value={formatSubscriptionDate(item.currentPeriodEnd)}
          />
          <Detail label="Último pago" value={paidAmount} />
          <Detail
            label="Método"
            value={
              latestPayment
                ? getPaymentMethodLabel(latestPayment.method)
                : "No disponible"
            }
          />
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--subscription-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
            Compra única, sin renovación automática
          </span>
          {item.isSelectedLevel ? (
            <span className="font-semibold text-[var(--subscription-accent)]">
              Nivel seleccionado
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

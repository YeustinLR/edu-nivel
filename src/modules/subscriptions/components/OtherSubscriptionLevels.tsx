import { ArrowRight, Clock3, Layers3, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Role } from "@/generated/prisma/enums";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import {
  selectStudentSubscriptionLevelAction,
  selectTeacherSubscriptionLevelAction,
} from "@/modules/subscriptions/actions/learner-subscription-actions";
import { SubscriptionStatusBadge } from "@/modules/subscriptions/components/SubscriptionStatusBadge";
import {
  formatSubscriptionDate,
  getPlanIntervalLabel,
} from "@/modules/subscriptions/lib/learner-subscription-presentation";
import type {
  LearnerSubscriptionItem,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";

const actionClass =
  "inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--subscription-border)] px-3 text-xs font-semibold text-[var(--subscription-text)] transition-colors hover:bg-[var(--subscription-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--subscription-accent)] sm:w-auto";

export function OtherSubscriptionLevels({
  items,
  role,
}: {
  items: LearnerSubscriptionItem[];
  role: LearnerSubscriptionRole;
}) {
  if (items.length === 0) return null;
  const selectAction =
    role === Role.STUDENT
      ? selectStudentSubscriptionLevelAction
      : selectTeacherSubscriptionLevelAction;

  return (
    <section
      aria-labelledby="other-levels-heading"
      className="overflow-hidden rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)]"
    >
      <header className="flex items-center gap-2.5 border-b border-[var(--subscription-border)] px-5 py-3.5">
        <Layers3
          aria-hidden="true"
          className="h-4.5 w-4.5 text-[var(--subscription-accent)]"
        />
        <h2
          id="other-levels-heading"
          className="font-semibold text-[var(--subscription-text)]"
        >
          Otros niveles
        </h2>
        <span className="ml-auto text-xs tabular-nums text-[var(--subscription-muted)]">
          {items.length}
        </span>
      </header>

      <div className="grid divide-y divide-[var(--subscription-border)] lg:grid-cols-2 lg:divide-y-0">
        {items.map((item, index) => (
          <article
            key={item.id}
            className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${
              index % 2 === 1
                ? "lg:border-l lg:border-[var(--subscription-border)]"
                : ""
            } ${index > 1 ? "lg:border-t" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--subscription-text)]">
                  {formatLearnerLevel(item.level.levelNumber)}
                </h3>
                <SubscriptionStatusBadge status={item.effectiveStatus} />
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--subscription-muted)]">
                {item.lastPlanCode
                  ? `${getPlanIntervalLabel(item.lastPlanCode)} · `
                  : ""}
                {item.canStudy ? "Disponible hasta" : "Finalizó el"}{" "}
                {formatSubscriptionDate(item.currentPeriodEnd)}
              </p>
            </div>

            {item.openPayment ? (
              <Link href={item.openPayment.href} className={actionClass}>
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                Continuar
              </Link>
            ) : item.canStudy ? (
              <form action={selectAction}>
                <input type="hidden" name="subscriptionId" value={item.id} />
                <button type="submit" className={actionClass}>
                  Entrar
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : item.canRenew ? (
              <Link
                href={`/dashboard/subscription/renew/${encodeURIComponent(item.id)}`}
                className={actionClass}
              >
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                Renovar
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

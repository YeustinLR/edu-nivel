import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  Plus,
  RefreshCw,
} from "lucide-react";

import { Role } from "@/generated/prisma/enums";
import {
  selectStudentSubscriptionLevelAction,
  selectTeacherSubscriptionLevelAction,
} from "@/modules/subscriptions/actions/learner-subscription-actions";
import { amountMinorToCRC } from "@/modules/subscriptions/config/plan-catalog";
import type {
  LearnerSubscriptionEffectiveStatus,
  LearnerSubscriptionItem,
  LearnerSubscriptionOverview,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";
import { learnerCheckoutErrorMessages } from "@/modules/subscriptions/components/LearnerSubscriptionCheckout";

const effectiveStatusPresentation: Record<
  LearnerSubscriptionEffectiveStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Activa",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  EXPIRED: {
    label: "Vencida",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  CANCELED: {
    label: "Cancelada",
    className:
      "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  },
  INACTIVE: {
    label: "Inactiva",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

const pendingStatusLabels = {
  INITIALIZING: "Inicializando",
  PROCESSING: "Esperando confirmación",
  REQUIRES_REVIEW: "Requiere revisión",
} as const;

function planLabel(planCode: LearnerSubscriptionItem["lastPlanCode"]) {
  if (!planCode) return "Sin plan registrado";
  return planCode.endsWith("YEARLY") ? "Plan anual" : "Plan mensual";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function SubscriptionCard({
  item,
  role,
}: {
  item: LearnerSubscriptionItem;
  role: LearnerSubscriptionRole;
}) {
  const status = effectiveStatusPresentation[item.effectiveStatus];
  const selectAction =
    role === Role.STUDENT
      ? selectStudentSubscriptionLevelAction
      : selectTeacherSubscriptionLevelAction;
  const contentHref =
    role === Role.STUDENT
      ? "/dashboard/student/content"
      : "/dashboard/teacher/content";

  return (
    <article className="relative overflow-hidden rounded-[1.35rem] border border-[var(--student-border)] bg-[var(--student-panel)] p-6 shadow-[0_6px_24px_rgba(15,23,42,0.045)]">
      <div aria-hidden="true" className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[var(--student-blue-soft)]" />
      <div className="relative flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]">
          <GraduationCap aria-hidden="true" className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${status.className}`}>
              {status.label}
            </span>
            {item.isSelectedLevel ? (
              <span className="rounded-full bg-[var(--student-blue-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--student-blue)]">
                Nivel en uso
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-extrabold tracking-[-0.03em] text-[var(--student-text)]">
            Nivel {item.level.levelNumber}
          </h2>
          {item.level.description ? (
            <p className="mt-1 line-clamp-1 text-sm text-[var(--student-muted)]">
              {item.level.description}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="relative mt-6 grid gap-3 rounded-2xl bg-[var(--student-bg)] p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-[var(--student-muted)]">Plan</dt>
          <dd className="mt-1 text-sm font-bold text-[var(--student-text)]">{planLabel(item.lastPlanCode)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-[var(--student-muted)]">Vencimiento</dt>
          <dd className="mt-1 text-sm font-bold text-[var(--student-text)]">{dateLabel(item.currentPeriodEnd)}</dd>
        </div>
      </dl>

      <div className="relative mt-5 flex flex-wrap gap-2.5">
        {item.canRenew ? (
          <Link href={`/dashboard/subscription/renew/${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--student-blue)] px-4 text-sm font-bold text-white transition hover:-translate-y-0.5">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Renovar
          </Link>
        ) : null}
        {item.canStudy && !item.isSelectedLevel ? (
          <form action={selectAction}>
            <input type="hidden" name="subscriptionId" value={item.id} />
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--student-border)] px-4 text-sm font-bold text-[var(--student-text)] transition hover:bg-[var(--student-soft)]">
              <BookOpenCheck aria-hidden="true" className="h-4 w-4 text-[var(--student-blue)]" />
              Estudiar este nivel
            </button>
          </form>
        ) : item.canStudy && item.isSelectedLevel ? (
          <Link href={contentHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--student-border)] px-4 text-sm font-bold text-[var(--student-text)] transition hover:bg-[var(--student-soft)]">
            Continuar aprendiendo <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
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

  return (
    <div className={`${themeClass} space-y-8`}>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--student-blue)]">Tu acceso</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--student-text)] sm:text-4xl">Mi suscripción</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--student-muted)] sm:text-base">Administra los niveles que has adquirido y renueva tu acceso cuando lo necesites.</p>
        </div>
        {data.availableLevelCount > 0 ? (
          <Link href="/dashboard/subscription/new" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--student-blue)] px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(23,104,229,0.2)] transition hover:-translate-y-0.5">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Adquirir otro nivel
          </Link>
        ) : null}
      </header>

      {error ? <div role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-200">{learnerCheckoutErrorMessages[error] ?? "No fue posible completar la operación."}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-[1.25rem] border border-[var(--student-border)] bg-[var(--student-panel)] p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]"><CreditCard aria-hidden="true" className="h-6 w-6" /></span>
          <div><p className="text-2xl font-extrabold text-[var(--student-text)]">{data.subscriptions.length}</p><p className="text-sm text-[var(--student-muted)]">{data.subscriptions.length === 1 ? "nivel adquirido" : "niveles adquiridos"}</p></div>
        </div>
        <div className="flex items-center gap-4 rounded-[1.25rem] border border-[var(--student-border)] bg-[var(--student-panel)] p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 aria-hidden="true" className="h-6 w-6" /></span>
          <div><p className="text-2xl font-extrabold text-[var(--student-text)]">{data.activeCount}</p><p className="text-sm text-[var(--student-muted)]">{data.activeCount === 1 ? "suscripción activa" : "suscripciones activas"}</p></div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold tracking-[-0.025em] text-[var(--student-text)]">Mis niveles</h2></div>
        {data.subscriptions.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.subscriptions.map((item) => <SubscriptionCard key={item.id} item={item} role={role} />)}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]"><GraduationCap aria-hidden="true" className="h-7 w-7" /></span>
            <h2 className="mt-4 text-lg font-bold text-[var(--student-text)]">Todavía no has adquirido niveles</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-[var(--student-muted)]">Elige un nivel y un plan para comenzar a utilizar sus materias y recursos.</p>
            {data.availableLevelCount > 0 ? <Link href="/dashboard/subscription/new" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--student-blue)] px-4 text-sm font-bold text-white"><Plus aria-hidden="true" className="h-4 w-4" />Adquirir un nivel</Link> : null}
          </div>
        )}
      </section>

      {data.pendingPayments.length ? (
        <section>
          <h2 className="mb-4 text-xl font-extrabold tracking-[-0.025em] text-[var(--student-text)]">Operaciones en proceso</h2>
          <div className="space-y-3">
            {data.pendingPayments.map((payment) => (
              <article key={payment.id} className="flex flex-col gap-4 rounded-[1.25rem] border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-400/15 dark:bg-amber-500/10 sm:flex-row sm:items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{payment.status === "REQUIRES_REVIEW" ? <AlertTriangle aria-hidden="true" className="h-5 w-5" /> : <Clock3 aria-hidden="true" className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1"><h3 className="font-bold text-[var(--student-text)]">Nivel {payment.levelNumber} · {payment.planCode.endsWith("YEARLY") ? "Plan anual" : "Plan mensual"}</h3><p className="mt-1 text-sm text-[var(--student-muted)]">{pendingStatusLabels[payment.status]} · {new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(amountMinorToCRC(payment.expectedAmountMinor))}. No inicies otro pago para este nivel.</p></div>
                <Link href={payment.href} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/70 px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-500/10">Ver estado</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

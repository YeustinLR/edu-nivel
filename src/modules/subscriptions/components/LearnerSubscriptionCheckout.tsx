"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Role } from "@/generated/prisma/enums";
import { formatCRC } from "@/lib/currency";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import { CheckoutStepper } from "@/modules/subscriptions/components/CheckoutStepper";
import {
  amountMinorToCRC,
  getSubscriptionPlan,
  getSubscriptionPlansForRole,
  type SubscriptionPlanCode,
} from "@/modules/subscriptions/config/plan-catalog";
import type {
  LearnerSubscriptionCheckoutLevel,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";
import {
  initialLearnerCheckoutActionState,
  learnerCheckoutErrorMessages,
  type LearnerCheckoutActionState,
} from "@/modules/subscriptions/types/learner-checkout-action-state";

function CheckoutFieldError({
  id,
  messages,
}: {
  id: string;
  messages?: string[];
}) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-300">
      {messages[0]}
    </p>
  );
}

export function LearnerSubscriptionCheckout({
  role = Role.STUDENT,
  mode,
  levels,
  defaultLevelId,
  fixedLevel,
  subscriptionId,
  defaultPlanCode = "STUDENT_MONTHLY",
  checkoutRequestId,
  error,
  action,
}: {
  role?: LearnerSubscriptionRole;
  mode: "new" | "renew";
  levels?: LearnerSubscriptionCheckoutLevel[];
  defaultLevelId?: string;
  fixedLevel?: LearnerSubscriptionCheckoutLevel;
  subscriptionId?: string;
  defaultPlanCode?: SubscriptionPlanCode;
  checkoutRequestId: string;
  error?: string;
  action: (
    previousState: LearnerCheckoutActionState,
    formData: FormData,
  ) => Promise<LearnerCheckoutActionState>;
}) {
  const renewal = mode === "renew";
  const plans = getSubscriptionPlansForRole(role);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLevelId, setSelectedLevelId] = useState(
    fixedLevel?.id ?? defaultLevelId ?? "",
  );
  const [selectedPlanCode, setSelectedPlanCode] =
    useState<SubscriptionPlanCode>(defaultPlanCode);
  const [stepError, setStepError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    action,
    initialLearnerCheckoutActionState,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const phoneErrorId = useId();
  const identificationTypeErrorId = useId();
  const identificationErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const effectiveCheckoutRequestId =
    state.status === "error"
      ? state.values.checkoutRequestId
      : checkoutRequestId;
  const selectedLevel =
    fixedLevel ?? levels?.find((level) => level.id === selectedLevelId);
  const selectedPlan = getSubscriptionPlan(selectedPlanCode);
  const themeClass =
    role === Role.STUDENT
      ? "student-subscription-theme"
      : "teacher-subscription-theme";

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function continueToPayerData() {
    if (!selectedLevelId) {
      setStepError("Selecciona el nivel que deseas adquirir.");
      return;
    }
    if (!selectedPlan) {
      setStepError("Selecciona una modalidad de acceso.");
      return;
    }
    setStepError(null);
    setStep(2);
  }

  return (
    <div className={`${themeClass} mx-auto max-w-5xl space-y-5`}>
      <Link href="/dashboard/subscription" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--subscription-muted)] transition hover:text-[var(--subscription-accent)]">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />Volver a Mi suscripción
      </Link>

      <div className="rounded-[1.25rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] p-4 shadow-[0_6px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <CheckoutStepper currentStep={step} />

      <header className="mt-4 border-t border-[var(--subscription-border)] pt-4 text-center sm:text-left">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--subscription-accent)]">
          {renewal ? "Extiende tu acceso" : "Nuevo nivel"}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1.5 text-2xl font-extrabold tracking-[-0.035em] text-[var(--subscription-text)] outline-none sm:text-3xl">
          {step === 1
            ? renewal
              ? `Renovar ${formatLearnerLevel(fixedLevel?.levelNumber ?? 0)}`
              : "Elige tu acceso"
            : "Completa tu suscripción"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-5 text-[var(--subscription-muted)]">
          {step === 1
            ? "Selecciona el nivel y el tiempo que deseas desbloquear."
            : "Necesitamos estos datos para asociar y confirmar tu transferencia."}
        </p>
      </header>
      </div>

      {error || state.status === "error" ? (
        <div role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-200">
          {state.status === "error"
            ? state.message
            : learnerCheckoutErrorMessages[error!] ??
              "No fue posible preparar la operación."}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid items-stretch overflow-hidden rounded-[1.25rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] shadow-[0_6px_24px_rgba(15,23,42,0.04)] lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]">
          <section className="p-5 lg:border-r lg:border-[var(--subscription-border)] lg:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--subscription-accent-soft)] text-[var(--subscription-accent)]">
                <GraduationCap aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-[var(--subscription-text)]">Nivel educativo</h2>
                <p className="text-sm text-[var(--subscription-muted)]">Cada nivel mantiene su propia vigencia.</p>
              </div>
            </div>
            {fixedLevel ? (
              <div className="mt-4 rounded-xl bg-[var(--subscription-bg)] p-3.5">
                <p className="text-lg font-extrabold text-[var(--subscription-text)]">{formatLearnerLevel(fixedLevel.levelNumber)}</p>
                {fixedLevel.description ? <p className="mt-1 text-sm text-[var(--subscription-muted)]">{fixedLevel.description}</p> : null}
              </div>
            ) : (
              <label className="mt-4 block space-y-1.5 text-sm font-bold text-[var(--subscription-text)]">
                Nivel que deseas adquirir
                <select value={selectedLevelId} onChange={(event) => setSelectedLevelId(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-3.5 font-medium outline-none focus:border-[var(--subscription-accent)] focus:ring-2 focus:ring-blue-500/15">
                  <option value="" disabled>Selecciona un nivel</option>
                  {levels?.map((level) => (
                    <option key={level.id} value={level.id}>
                      {formatLearnerLevel(level.levelNumber)}{level.description ? ` — ${level.description}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <fieldset className="border-t border-[var(--subscription-border)] p-5 lg:border-t-0 lg:p-6">
            <legend className="sr-only">Selecciona una modalidad</legend>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <CalendarDays aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-[var(--subscription-text)]">Tiempo de acceso</h2>
                <p className="text-sm text-[var(--subscription-muted)]">Es una compra única, sin renovación automática.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => (
                <label key={plan.code} className="cursor-pointer rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] p-4 transition has-[:checked]:border-[var(--subscription-accent)] has-[:checked]:ring-2 has-[:checked]:ring-blue-500/15">
                  <input type="radio" name="visualPlanCode" value={plan.code} checked={plan.code === selectedPlanCode} onChange={() => setSelectedPlanCode(plan.code)} className="mr-2 accent-blue-600" />
                  <span className="font-bold text-[var(--subscription-text)]">{plan.billingInterval === "MONTHLY" ? "Mensual" : "Anual"}</span>
                  <span className="mt-2 block text-xl font-extrabold text-[var(--subscription-text)]">{formatCRC(amountMinorToCRC(plan.amountMinor))}</span>
                  <span className="mt-1 block text-xs text-[var(--subscription-muted)]">{plan.durationMonths === 1 ? "1 mes de acceso" : "12 meses de acceso"}</span>
                </label>
              ))}
            </div>
          </fieldset>
          </div>

          {stepError ? <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-300">{stepError}</p> : null}
          <div className="flex justify-end">
            <button type="button" onClick={continueToPayerData} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--subscription-accent)] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(23,104,229,0.18)] transition hover:-translate-y-0.5 sm:w-auto">
              Continuar<ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-4" aria-busy={isPending}>
          <input type="hidden" name="checkoutRequestId" value={effectiveCheckoutRequestId} />
          <input type="hidden" name="planCode" value={selectedPlanCode} />
          {subscriptionId ? <input type="hidden" name="subscriptionId" value={subscriptionId} /> : <input type="hidden" name="levelId" value={selectedLevelId} />}

          <div className="grid items-stretch overflow-hidden rounded-[1.25rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] shadow-[0_6px_24px_rgba(15,23,42,0.04)] lg:grid-cols-[minmax(230px,0.62fr)_minmax(0,1.38fr)]">
          <section aria-label="Resumen de selección" className="grid bg-[var(--subscription-bg)] sm:grid-cols-2 lg:grid-cols-1">
            <div className="p-4 text-center sm:border-r sm:border-[var(--subscription-border)] lg:border-b lg:border-r-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--subscription-muted)]">Nivel seleccionado</p>
              <GraduationCap aria-hidden="true" className="mx-auto mt-2 h-5 w-5 text-[var(--subscription-accent)]" />
              <p className="mt-1.5 font-extrabold text-[var(--subscription-text)]">{selectedLevel ? formatLearnerLevel(selectedLevel.levelNumber) : "Sin seleccionar"}</p>
            </div>
            <div className="border-t border-[var(--subscription-border)] p-4 text-center sm:border-t-0 lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--subscription-muted)]">Acceso seleccionado</p>
              <CalendarDays aria-hidden="true" className="mx-auto mt-2 h-5 w-5 text-[var(--subscription-accent)]" />
              <p className="mt-1.5 font-extrabold text-[var(--subscription-text)]">{selectedPlan?.billingInterval === "YEARLY" ? "Anual" : "Mensual"} · {selectedPlan ? formatCRC(amountMinorToCRC(selectedPlan.amountMinor)) : ""}</p>
            </div>
          </section>

          <section className="border-t border-[var(--subscription-border)] p-5 lg:border-l lg:border-t-0 lg:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Smartphone aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-[var(--subscription-text)]">Datos del pagador</h2>
                <p className="text-sm text-[var(--subscription-muted)]">Deben coincidir con la cuenta desde la que realizarás el SINPE.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-bold text-[var(--subscription-text)]">
                Número SINPE del pagador
                <input key={`phone-${state.revision}`} name="mobileNumber" inputMode="tel" autoComplete="tel" placeholder="8888 8888" required disabled={isPending} aria-invalid={Boolean(errors?.mobileNumber)} aria-describedby={errors?.mobileNumber ? phoneErrorId : undefined} className="min-h-11 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-3.5 font-medium outline-none focus:border-[var(--subscription-accent)] focus:ring-2 focus:ring-blue-500/15" />
                <CheckoutFieldError id={phoneErrorId} messages={errors?.mobileNumber} />
              </label>
              <label className="space-y-1.5 text-sm font-bold text-[var(--subscription-text)]">
                Tipo de identificación
                <select key={`identification-type-${state.revision}`} name="identificationType" defaultValue="0" disabled={isPending} aria-invalid={Boolean(errors?.identificationType)} aria-describedby={errors?.identificationType ? identificationTypeErrorId : undefined} className="min-h-11 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-3.5 font-medium outline-none focus:border-[var(--subscription-accent)] focus:ring-2 focus:ring-blue-500/15">
                  <option value="0">Persona física nacional</option><option value="1">Persona física residente</option><option value="2">Entidad estatal</option><option value="3">Persona jurídica</option><option value="4">Institución autónoma</option><option value="5">Diplomático</option><option value="9">Extranjero</option>
                </select>
                <CheckoutFieldError id={identificationTypeErrorId} messages={errors?.identificationType} />
              </label>
              <label className="space-y-1.5 text-sm font-bold text-[var(--subscription-text)] sm:col-span-2">
                Identificación asociada a la cuenta
                <input key={`identification-${state.revision}`} name="identification" autoComplete="off" placeholder="01-1393-1919" required disabled={isPending} aria-invalid={Boolean(errors?.identification)} aria-describedby={errors?.identification ? identificationErrorId : undefined} className="min-h-11 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-3.5 font-medium outline-none focus:border-[var(--subscription-accent)] focus:ring-2 focus:ring-blue-500/15" />
                <CheckoutFieldError id={identificationErrorId} messages={errors?.identification} />
              </label>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--subscription-muted)]">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />EduNivel conserva solamente los últimos cuatro caracteres de los datos sensibles reportados para conciliar la transferencia.
            </p>
          </section>
          </div>

          <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-100">
            No envíes dinero todavía. El monto y el número aparecerán en el siguiente paso después de crear la solicitud.
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" disabled={isPending} onClick={() => setStep(1)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--subscription-border)] px-4 text-sm font-bold text-[var(--subscription-text)] hover:bg-[var(--subscription-soft)] disabled:opacity-60">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />Volver al plan
            </button>
            <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--subscription-accent)] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(23,104,229,0.18)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65">
              {isPending ? "Preparando pago..." : "Continuar al SINPE"}<ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

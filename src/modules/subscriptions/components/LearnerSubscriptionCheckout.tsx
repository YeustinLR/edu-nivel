import Link from "next/link";
import { ArrowLeft, CalendarDays, CreditCard, GraduationCap, ShieldCheck } from "lucide-react";

import { Role } from "@/generated/prisma/enums";
import {
  amountMinorToCRC,
  getSubscriptionPlansForRole,
  type SubscriptionPlanCode,
} from "@/modules/subscriptions/config/plan-catalog";
import type {
  LearnerSubscriptionCheckoutLevel,
  LearnerSubscriptionRole,
} from "@/modules/subscriptions/types/learner-subscription";

export const learnerCheckoutErrorMessages: Record<string, string> = {
  INVALID_PAYMENT_DATA: "Revisa la información del pago e inténtalo nuevamente.",
  PLAN_NOT_ALLOWED: "El plan seleccionado no corresponde a tu rol.",
  ROLE_NOT_ALLOWED: "Tu cuenta no puede adquirir suscripciones.",
  CHECKOUT_REQUEST_CONFLICT: "La operación de pago no pertenece a tu cuenta.",
  LEVEL_NOT_AVAILABLE: "El nivel seleccionado ya no está disponible.",
  LEVEL_IS_FREE: "Este nivel es gratuito y no requiere pago.",
  LEVEL_ALREADY_OWNED: "Ya tienes una suscripción para ese nivel. Utiliza la opción Renovar.",
  SUBSCRIPTION_NOT_FOUND: "No encontramos una suscripción tuya para renovar.",
  SUBSCRIPTION_NOT_RENEWABLE: "Este nivel no se puede renovar actualmente.",
  PAYMENT_ALREADY_OPEN: "Ya existe una operación pendiente para ese nivel.",
  ONVO_NOT_CONFIGURED: "ONVO no está configurado en este entorno.",
  PAYMENT_INITIALIZATION_FAILED: "No fue posible iniciar el pago. Revisa el intento antes de volver a probar.",
};

export function LearnerSubscriptionCheckout({
  role = Role.STUDENT,
  mode,
  levels,
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
  fixedLevel?: LearnerSubscriptionCheckoutLevel;
  subscriptionId?: string;
  defaultPlanCode?: SubscriptionPlanCode;
  checkoutRequestId: string;
  error?: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const renewal = mode === "renew";
  const plans = getSubscriptionPlansForRole(role);
  const themeClass =
    role === Role.STUDENT
      ? "student-subscription-theme"
      : "teacher-subscription-theme";

  return (
    <div className={`${themeClass} mx-auto max-w-4xl space-y-7`}>
      <Link href="/dashboard/subscription" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--subscription-muted)] transition hover:text-[var(--subscription-accent)]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Volver a Mi suscripción</Link>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--subscription-accent)]">{renewal ? "Extiende tu acceso" : "Nuevo nivel"}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--subscription-text)] sm:text-4xl">{renewal ? `Renovar Nivel ${fixedLevel?.levelNumber}` : "Adquirir una suscripción"}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--subscription-muted)] sm:text-base">{renewal ? "El tiempo comprado se añadirá al vencimiento actual si tu acceso todavía está vigente." : "Selecciona el nivel y la duración que quieres desbloquear."}</p>
      </header>

      {error ? <div role="alert" className="rounded-2xl border border-rose-300/60 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-200">{learnerCheckoutErrorMessages[error] ?? "No fue posible preparar la operación."}</div> : null}

      <form action={action} className="space-y-6">
        <input type="hidden" name="checkoutRequestId" value={checkoutRequestId} />
        {subscriptionId ? <input type="hidden" name="subscriptionId" value={subscriptionId} /> : null}

        <section className="rounded-[1.35rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] p-6 shadow-[0_6px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--subscription-accent-soft)] text-[var(--subscription-accent)]"><GraduationCap aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="font-bold text-[var(--subscription-text)]">Nivel educativo</h2><p className="text-sm text-[var(--subscription-muted)]">Cada nivel mantiene su propia vigencia.</p></div></div>
          {fixedLevel ? (
            <div className="mt-5 rounded-xl bg-[var(--subscription-bg)] p-4"><p className="text-lg font-extrabold text-[var(--subscription-text)]">Nivel {fixedLevel.levelNumber}</p>{fixedLevel.description ? <p className="mt-1 text-sm text-[var(--subscription-muted)]">{fixedLevel.description}</p> : null}</div>
          ) : (
            <label className="mt-5 block space-y-2 text-sm font-bold text-[var(--subscription-text)]">Nivel que deseas adquirir<select name="levelId" required defaultValue="" className="min-h-12 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-4 font-medium outline-none focus:border-[var(--subscription-accent)] focus:ring-2 focus:ring-blue-500/15"><option value="" disabled>Selecciona un nivel</option>{levels?.map((level) => <option key={level.id} value={level.id}>Nivel {level.levelNumber}{level.description ? ` — ${level.description}` : ""}</option>)}</select></label>
          )}
        </section>

        <fieldset className="rounded-[1.35rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] p-6 shadow-[0_6px_24px_rgba(15,23,42,0.04)]">
          <legend className="sr-only">Selecciona un plan</legend>
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><CalendarDays aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="font-bold text-[var(--subscription-text)]">Duración</h2><p className="text-sm text-[var(--subscription-muted)]">Puedes cambiar el plan sugerido antes de pagar.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => <label key={plan.code} className="cursor-pointer rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] p-5 transition has-[:checked]:border-[var(--subscription-accent)] has-[:checked]:ring-2 has-[:checked]:ring-blue-500/15"><input type="radio" name="planCode" value={plan.code} defaultChecked={plan.code === defaultPlanCode} required className="mr-2 accent-blue-600" /><span className="font-bold text-[var(--subscription-text)]">{plan.billingInterval === "MONTHLY" ? "Mensual" : "Anual"}</span><span className="mt-3 block text-2xl font-extrabold text-[var(--subscription-text)]">{new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(amountMinorToCRC(plan.amountMinor))}</span><span className="mt-1 block text-xs text-[var(--subscription-muted)]">{plan.durationMonths === 1 ? "1 mes de acceso" : "12 meses de acceso"}</span></label>)}
          </div>
        </fieldset>

        <section className="rounded-[1.35rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] p-6 shadow-[0_6px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CreditCard aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="font-bold text-[var(--subscription-text)]">Datos SINPE Móvil</h2><p className="text-sm text-[var(--subscription-muted)]">El acceso se aplica únicamente después de la confirmación de ONVO.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[var(--subscription-text)]">Número del pagador<input name="mobileNumber" inputMode="tel" placeholder="88888888" required className="min-h-12 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-4 font-medium outline-none focus:border-[var(--subscription-accent)]" /></label>
            <label className="space-y-2 text-sm font-bold text-[var(--subscription-text)]">Tipo de identificación<select name="identificationType" defaultValue="0" className="min-h-12 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-4 font-medium outline-none focus:border-[var(--subscription-accent)]"><option value="0">Persona física nacional</option><option value="1">Persona física residente</option><option value="2">Entidad estatal</option><option value="3">Persona jurídica</option><option value="4">Institución autónoma</option><option value="5">Diplomático</option><option value="9">Extranjero</option></select></label>
            <label className="space-y-2 text-sm font-bold text-[var(--subscription-text)] sm:col-span-2">Identificación asociada a la cuenta<input name="identification" autoComplete="off" placeholder="01-1234-5678" required className="min-h-12 w-full rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-bg)] px-4 font-medium outline-none focus:border-[var(--subscription-accent)]" /></label>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--subscription-muted)]"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />EduNivel conserva solamente los últimos cuatro caracteres de los datos sensibles reportados para conciliar la transferencia.</p>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/dashboard/subscription" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--subscription-border)] px-5 text-sm font-bold text-[var(--subscription-text)] hover:bg-[var(--subscription-soft)]">Cancelar</Link><button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--subscription-accent)] px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(23,104,229,0.2)] transition hover:-translate-y-0.5"><CreditCard aria-hidden="true" className="h-4 w-4" />Iniciar pago con SINPE</button></div>
      </form>
    </div>
  );
}

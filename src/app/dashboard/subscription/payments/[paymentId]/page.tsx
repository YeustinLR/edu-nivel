import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { env } from "@/config/env";
import { PaymentStatus, ProviderMode, Role } from "@/generated/prisma/enums";
import { formatCRC } from "@/lib/currency";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import { reconcileSinpePaymentAction } from "@/modules/payments/actions/reconcile-sinpe-payment";
import { CopyValueButton } from "@/modules/payments/components/CopyValueButton";
import { PaymentStatusPoller } from "@/modules/payments/components/PaymentStatusPoller";
import { PaymentStatusTimeline } from "@/modules/payments/components/PaymentStatusTimeline";
import { StalePaymentCancellation } from "@/modules/payments/components/StalePaymentCancellation";
import {
  isStaleSinpePayment,
  SINPE_STALE_AFTER_MS,
} from "@/modules/payments/domain/sinpe-payment-lifecycle";
import {
  selectStudentSubscriptionLevelAction,
  selectTeacherSubscriptionLevelAction,
} from "@/modules/subscriptions/actions/learner-subscription-actions";
import { CheckoutStepper } from "@/modules/subscriptions/components/CheckoutStepper";
import { amountMinorToCRC } from "@/modules/subscriptions/config/plan-catalog";
import {
  formatSubscriptionDateTime,
  getPaymentMethodLabel,
  getPlanIntervalLabel,
} from "@/modules/subscriptions/lib/learner-subscription-presentation";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

const statusCopy: Record<
  PaymentStatus,
  { title: string; description: string }
> = {
  INITIALIZING: {
    title: "Estamos preparando tu pago",
    description: "La solicitud está guardada. No realices una transferencia hasta que aparezcan el monto y el número.",
  },
  PROCESSING: {
    title: "Realiza tu SINPE Móvil",
    description: "Usa exactamente los datos mostrados y espera la confirmación del pago.",
  },
  SUCCEEDED: {
    title: "¡Pago confirmado!",
    description: "El acceso ya fue aplicado a tu cuenta.",
  },
  FAILED: {
    title: "No se pudo completar el pago",
    description: "El pago fue rechazado o no pudo procesarse.",
  },
  CANCELED: {
    title: "Intento cancelado",
    description: "Esta solicitud ya no puede recibir una transferencia.",
  },
  REFUNDED: {
    title: "Pago reembolsado",
    description: "El pago fue devuelto y el acceso asociado fue actualizado.",
  },
  REQUIRES_REVIEW: {
    title: "Estamos revisando tu pago",
    description: "No inicies otro pago hasta comprobar el estado de esta operación.",
  },
};

export default async function PaymentStatusPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const user = await requireUser();
  const { paymentId } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: user.id },
    include: {
      level: {
        select: { id: true, levelNumber: true, description: true },
      },
      subscription: { select: { id: true } },
    },
  });
  if (!payment) notFound();

  const existingSubscription =
    payment.subscription ??
    (await prisma.subscription.findUnique({
      where: {
        userId_levelId: { userId: user.id, levelId: payment.levelId },
      },
      select: { id: true },
    }));
  const isPending =
    payment.status === PaymentStatus.INITIALIZING ||
    payment.status === PaymentStatus.PROCESSING;
  const isStale = isStaleSinpePayment(payment);
  const pollingDeadlineAt =
    payment.createdAt.getTime() + SINPE_STALE_AFTER_MS;
  const isSuccess = payment.status === PaymentStatus.SUCCEEDED;
  const amountMinor = isSuccess
    ? payment.receivedAmountMinor ?? payment.expectedAmountMinor
    : payment.expectedAmountMinor;
  const amount = formatCRC(amountMinorToCRC(amountMinor));
  const destinationNumber = env.ONVO_SINPE_DESTINATION_NUMBER;
  const isTestMode = payment.providerMode === ProviderMode.TEST;
  const canShowTransfer = Boolean(
    isPending &&
      payment.providerPaymentIntentId &&
      payment.providerPaymentMethodId &&
      destinationNumber,
  );
  const status = statusCopy[payment.status];
  const visibleStatus =
    isPending && payment.providerMode === ProviderMode.TEST
      ? {
          title: "Estamos confirmando tu pago",
          description:
            "La operación está en proceso. Actualizaremos esta pantalla cuando recibamos la confirmación.",
        }
      : status;
  const retryHref = existingSubscription
    ? `/dashboard/subscription/renew/${encodeURIComponent(existingSubscription.id)}?plan=${encodeURIComponent(payment.planCode)}`
    : `/dashboard/subscription/new?level=${encodeURIComponent(payment.levelId)}&plan=${encodeURIComponent(payment.planCode)}`;
  const themeClass =
    user.role === Role.TEACHER
      ? "teacher-subscription-theme"
      : "student-subscription-theme";
  const selectAction =
    user.role === Role.TEACHER
      ? selectTeacherSubscriptionLevelAction
      : selectStudentSubscriptionLevelAction;

  return (
    <div className={`${themeClass} mx-auto max-w-5xl space-y-5`}>
      <PaymentStatusPoller
        paymentId={payment.id}
        initialStatus={payment.status}
        enabled={isPending && !isStale}
        deadlineAt={pollingDeadlineAt}
      />
      <Link href="/dashboard/subscription" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--subscription-muted)] transition hover:text-[var(--subscription-accent)]">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />Volver a Mi suscripción
      </Link>
      <div className="rounded-[1.15rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] px-4 py-3 shadow-[0_5px_20px_rgba(15,23,42,0.035)] sm:px-5">
        <CheckoutStepper currentStep={isSuccess ? 4 : 3} />
      </div>

      {isSuccess ? (
        <section className="grid overflow-hidden rounded-[1.35rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] shadow-[0_10px_35px_rgba(15,23,42,0.05)] lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
          <div className="flex flex-col items-center justify-center border-b border-[var(--subscription-border)] bg-emerald-50/70 p-6 text-center dark:bg-emerald-500/5 lg:border-b-0 lg:border-r">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.22)]">
              <Check aria-hidden="true" className="h-8 w-8" strokeWidth={3} />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.035em] text-[var(--subscription-text)] sm:text-3xl">{status.title}</h1>
            <p className="mt-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-300">
              {formatLearnerLevel(payment.level.levelNumber)} ya está desbloqueado
            </p>
            <div className="mt-5 flex w-full max-w-xs flex-col gap-2.5">
              {existingSubscription ? (
                <form action={selectAction}>
                  <input type="hidden" name="subscriptionId" value={existingSubscription.id} />
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--subscription-accent)] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(23,104,229,0.18)]">
                    Entrar al nivel<ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </form>
              ) : null}
              <Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)] px-4 text-sm font-bold text-[var(--subscription-text)] hover:bg-[var(--subscription-soft)]">
                Ver mi suscripción
              </Link>
            </div>
          </div>

          <div className="p-5 text-left sm:p-6">
            <h2 className="font-bold text-[var(--subscription-text)]">Resumen de tu compra</h2>
            <p className="mt-1 text-sm text-[var(--subscription-muted)]">Detalles confirmados de la operación.</p>
            <dl className="mt-4 divide-y divide-[var(--subscription-border)] rounded-xl border border-[var(--subscription-border)] px-4">
              <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-[var(--subscription-muted)]">Nivel</dt><dd className="text-right font-bold text-[var(--subscription-text)]">{formatLearnerLevel(payment.level.levelNumber)}</dd></div>
              <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-[var(--subscription-muted)]">Acceso</dt><dd className="text-right font-bold text-[var(--subscription-text)]">{getPlanIntervalLabel(payment.planCode)}</dd></div>
              <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-[var(--subscription-muted)]">Monto pagado</dt><dd className="text-right font-bold text-[var(--subscription-text)]">{amount}</dd></div>
              <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-[var(--subscription-muted)]">Fecha</dt><dd className="text-right font-bold text-[var(--subscription-text)]">{formatSubscriptionDateTime(payment.confirmedAt ?? payment.appliedAt ?? payment.updatedAt)}</dd></div>
              <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-[var(--subscription-muted)]">Método</dt><dd className="text-right font-bold text-[var(--subscription-text)]">{getPaymentMethodLabel(payment.method)}</dd></div>
            </dl>
          </div>
        </section>
      ) : (
        <>
          <header className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--subscription-accent)]">Estado del pago</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-[-0.035em] text-[var(--subscription-text)] sm:text-3xl">{visibleStatus.title}</h1>
            <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-5 text-[var(--subscription-muted)]">{visibleStatus.description}</p>
            {isPending ? (
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                <Clock3 aria-hidden="true" className="h-4 w-4" />Esperando confirmación
              </span>
            ) : null}
          </header>

          <PaymentStatusTimeline status={payment.status} />

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <div className="space-y-4">
              {canShowTransfer && destinationNumber ? (
                <section className="overflow-hidden rounded-[1.25rem] border border-blue-200 bg-[var(--subscription-panel)] shadow-[0_6px_24px_rgba(23,104,229,0.07)] dark:border-blue-400/20">
                  {isTestMode ? (
                    <div role="status" className="border-b border-amber-300/60 bg-amber-50 px-5 py-3 text-center text-sm font-bold text-amber-900 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-100">
                      <AlertTriangle aria-hidden="true" className="mr-2 inline h-4 w-4" />Modo de prueba — no envíes dinero real.
                    </div>
                  ) : null}
                  <div className="grid gap-px bg-[var(--subscription-border)] sm:grid-cols-2">
                    <div className="bg-[var(--subscription-panel)] p-5 text-center">
                      <p className="text-sm font-bold text-[var(--subscription-muted)]">{isTestMode ? "Monto de prueba" : "Envía exactamente"}</p>
                      <p className="mt-1.5 select-all text-3xl font-extrabold tracking-[-0.035em] text-[var(--subscription-text)] sm:text-4xl">{amount}</p>
                      <div className="mt-3"><CopyValueButton value={String(amountMinorToCRC(payment.expectedAmountMinor))} label="Copiar monto" /></div>
                    </div>
                    <div className="bg-[var(--subscription-panel)] p-5 text-center">
                      <p className="text-sm font-bold text-[var(--subscription-muted)]">Al número</p>
                      <p className="mt-1.5 select-all text-3xl font-extrabold tracking-[-0.035em] text-[var(--subscription-text)] sm:text-4xl">{destinationNumber}</p>
                      <div className="mt-3"><CopyValueButton value={destinationNumber} label="Copiar número" /></div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="font-bold text-[var(--subscription-text)]">{isTestMode ? "Cómo simular el pago" : "Cómo realizar el pago"}</h2>
                    <ol className="mt-3 space-y-2.5">
                      {(isTestMode
                        ? [
                            "Revisa el monto que se usaría en el pago.",
                            "Comprueba el número SINPE destino mostrado.",
                            "No realices una transferencia bancaria real.",
                            "Espera la confirmación simulada de ONVO Sandbox.",
                          ]
                        : [
                            "Abre la aplicación de tu banco.",
                            "Selecciona SINPE Móvil.",
                            `Envía exactamente ${amount} al número mostrado.`,
                            "Regresa a EduNivel y espera la confirmación.",
                          ]).map((instruction, index) => (
                        <li key={instruction} className="flex gap-2.5 text-sm text-[var(--subscription-text)]">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--subscription-accent)] text-xs font-bold text-white">{index + 1}</span>{instruction}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-100">
                      <AlertTriangle aria-hidden="true" className="mr-2 inline h-4 w-4" />{isTestMode
                        ? "Esta operación usa ONVO Sandbox y no mueve dinero real."
                        : "No envíes el dinero antes de llegar a este paso."}
                    </div>
                  </div>
                </section>
              ) : null}

              {isPending && !canShowTransfer && destinationNumber ? (
                <section className="rounded-[1.25rem] border border-blue-200 bg-[var(--subscription-panel)] p-5 dark:border-blue-400/20">
                  <h2 className="font-bold text-[var(--subscription-text)]">Preparando las instrucciones</h2>
                  <p className="mt-1.5 text-sm leading-5 text-[var(--subscription-muted)]">No transfieras todavía. El monto y el número aparecerán cuando la solicitud esté lista.</p>
                </section>
              ) : null}

              {isPending && !destinationNumber ? (
                <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100">
                  <strong>No realices ninguna transferencia.</strong> El destino no está disponible. Conservaremos esta operación para revisarla de forma segura.
                </div>
              ) : null}

              {payment.status === PaymentStatus.REQUIRES_REVIEW ? (
                <div role="alert" className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-100">
                  Algún dato no coincide o la inicialización fue incierta. No inicies otro pago hasta consultar este intento.
                </div>
              ) : null}

              {(payment.status === PaymentStatus.FAILED || payment.status === PaymentStatus.CANCELED || payment.status === PaymentStatus.REFUNDED) ? (
                <div className="rounded-xl border border-rose-300/60 bg-rose-50 p-4 dark:border-rose-400/15 dark:bg-rose-500/10">
                  <h2 className="font-bold text-[var(--subscription-text)]">Esta operación finalizó</h2>
                  <p className="mt-1.5 text-sm leading-5 text-[var(--subscription-muted)]">Puedes iniciar una nueva solicitud; esta operación ya no bloquea otro pago para el nivel.</p>
                  <Link href={retryHref} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--subscription-accent)] px-4 text-sm font-bold text-white">Intentar nuevamente<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                </div>
              ) : null}
            </div>

            <aside className="space-y-3.5">
              {isPending ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-sm leading-5 text-blue-800 dark:border-blue-400/15 dark:bg-blue-500/10 dark:text-blue-200">
                  Puedes salir y volver. La solicitud está guardada en Mi suscripción.
                </div>
              ) : null}

              {isStale && isPending ? (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-400/15 dark:bg-amber-500/10">
                  <h2 className="font-bold text-[var(--subscription-text)]">Este intento lleva tiempo pendiente</h2>
                  <p className="mt-1.5 text-sm leading-5 text-[var(--subscription-muted)]">Si ya transferiste, verifica el estado y no vuelvas a pagar.</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2.5">
                {(isPending || payment.status === PaymentStatus.REQUIRES_REVIEW) ? (
                  <form action={reconcileSinpePaymentAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--subscription-border)] px-4 text-sm font-bold text-[var(--subscription-text)] hover:bg-[var(--subscription-soft)]">
                      <RefreshCw aria-hidden="true" className="h-4 w-4" />Verificar estado
                    </button>
                  </form>
                ) : null}
                {isPending && isStale ? <StalePaymentCancellation paymentId={payment.id} /> : null}
                <Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--subscription-border)] px-4 text-sm font-bold text-[var(--subscription-text)] hover:bg-[var(--subscription-soft)]">Volver a Mi suscripción</Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

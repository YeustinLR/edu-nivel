import Link from "next/link";
import { notFound } from "next/navigation";

import { PaymentStatus } from "@/generated/prisma/client";
import { reconcileSinpePaymentAction } from "@/modules/payments/actions/reconcile-sinpe-payment";
import { PaymentStatusPoller } from "@/modules/payments/components/PaymentStatusPoller";
import { isStaleSinpePayment } from "@/modules/payments/domain/sinpe-payment-lifecycle";
import { amountMinorToCRC } from "@/modules/subscriptions/config/plan-catalog";
import { env } from "@/config/env";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

const statusLabels: Record<PaymentStatus, string> = {
  INITIALIZING: "Inicializando",
  PROCESSING: "Esperando confirmacion",
  SUCCEEDED: "Pago confirmado",
  FAILED: "Pago rechazado",
  CANCELED: "Pago cancelado",
  REQUIRES_REVIEW: "Requiere revision",
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
    include: { level: { select: { levelNumber: true } } },
  });

  if (!payment) notFound();

  const isPending =
    payment.status === PaymentStatus.INITIALIZING ||
    payment.status === PaymentStatus.PROCESSING;
  const isStale = isStaleSinpePayment(payment);
  const amount = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(amountMinorToCRC(payment.expectedAmountMinor));
  const destinationNumber =
    env.ONVO_SINPE_DESTINATION_NUMBER ?? "+50670196686";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PaymentStatusPoller enabled={isPending && !isStale} />

      <div>
        <p className="text-sm text-muted">Operacion {payment.internalReference}</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          {statusLabels[payment.status]}
        </h1>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex justify-between gap-4 border-b border-border pb-3">
          <span className="text-muted">Plan</span>
          <span className="font-medium text-foreground">{payment.planCode}</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-border pb-3">
          <span className="text-muted">Nivel</span>
          <span className="font-medium text-foreground">
            Nivel {payment.level.levelNumber}
          </span>
        </div>
        <div className="flex justify-between gap-4 border-b border-border pb-3">
          <span className="text-muted">Monto exacto</span>
          <span className="font-medium text-foreground">{amount}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Estado ONVO</span>
          <span className="font-medium text-foreground">
            {payment.providerStatus ?? "pendiente"}
          </span>
        </div>
      </div>

      {isPending && payment.providerMode === "TEST" ? (
        <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-5">
          <p className="font-medium text-foreground">Prueba de Sandbox</p>
          <p className="mt-2 text-sm text-muted">
            No envies dinero real. ONVO simula el resultado automaticamente segun
            el numero de prueba utilizado y EduNivel espera la confirmacion.
          </p>
        </div>
      ) : null}

      {isPending && isStale ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-medium text-foreground">
            Este intento lleva tiempo pendiente
          </p>
          <p className="mt-2 text-sm text-muted">
            No significa que ONVO lo haya rechazado. Si realizaste el pago,
            consulta nuevamente el estado; una confirmacion tardia todavia puede
            activar la suscripcion.
          </p>
        </div>
      ) : null}

      {isPending && payment.providerMode === "LIVE" ? (
        <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-5">
          <p className="font-medium text-foreground">Realiza la transferencia</p>
          <p className="mt-2 text-sm text-muted">
            Envia exactamente {amount} por SINPE Movil al numero{" "}
            <strong className="text-foreground">{destinationNumber}</strong> desde
            la cuenta asociada a la identificacion indicada.
          </p>
          <p className="mt-2 text-xs text-muted">
            El numero mostrado es el configurado para el comercio; no concede acceso
            hasta que ONVO confirme el pago.
          </p>
        </div>
      ) : null}

      {payment.status === PaymentStatus.SUCCEEDED ? (
        <div className="rounded-xl border border-success/30 bg-success/10 p-5">
          <p className="font-medium text-foreground">
            Tu suscripcion ya fue activada o extendida.
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-3 inline-block rounded-lg bg-success px-4 py-2 font-medium text-white"
          >
            Volver a mis suscripciones
          </Link>
        </div>
      ) : null}

      {payment.status === PaymentStatus.REQUIRES_REVIEW ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
          La operacion no se aplico porque algun dato no coincide. No inicies otro
          pago hasta comprobar este intento.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {payment.providerPaymentIntentId && isPending ? (
          <form action={reconcileSinpePaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              Consultar estado en ONVO
            </button>
          </form>
        ) : null}
        <Link
          href="/dashboard/subscription"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
        >
          Volver a suscripcion
        </Link>
      </div>
    </div>
  );
}

"use server";

import { redirect } from "next/navigation";

import { PaymentStatus } from "@/generated/prisma/client";
import { isStaleSinpePayment } from "@/modules/payments/domain/sinpe-payment-lifecycle";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { cancelOnvoPaymentIntent } from "@/server/payments/onvo/client";
import { reconcileOnvoPaymentIntent } from "@/server/payments/onvo/reconcile";
import { recoverOnvoPaymentIntent } from "@/server/payments/onvo/recover-payment-intent";

const MINIMUM_RECONCILIATION_INTERVAL_MS = 5_000;

export async function reconcileSinpePaymentAction(formData: FormData) {
  const paymentId = formData.get("paymentId");
  const user = await requireUser();

  if (typeof paymentId !== "string" || !paymentId) {
    redirect("/dashboard/subscription");
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: user.id },
  });

  if (!payment) {
    redirect("/dashboard/subscription");
  }

  if (
    Date.now() - payment.updatedAt.getTime() >=
    MINIMUM_RECONCILIATION_INTERVAL_MS
  ) {
    if (payment.providerPaymentIntentId) {
      await reconcileOnvoPaymentIntent(payment.providerPaymentIntentId);
    } else {
      await recoverOnvoPaymentIntent(payment.id);
    }
  }

  redirect(`/dashboard/subscription/payments/${payment.id}`);
}

export async function cancelStaleSinpePaymentAction(formData: FormData) {
  const paymentId = formData.get("paymentId");
  const user = await requireUser();

  if (typeof paymentId !== "string" || !paymentId) {
    redirect("/dashboard/subscription");
  }

  let payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: user.id },
  });
  if (!payment) redirect("/dashboard/subscription");

  if (payment.providerPaymentIntentId) {
    await reconcileOnvoPaymentIntent(payment.providerPaymentIntentId);
    payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId: user.id },
    });
  } else {
    await recoverOnvoPaymentIntent(payment.id);
    payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId: user.id },
    });
  }

  const cancelableIntentId =
    payment &&
    isStaleSinpePayment(payment) &&
    (payment.status === PaymentStatus.INITIALIZING ||
      payment.status === PaymentStatus.PROCESSING) &&
    payment.providerPaymentIntentId
      ? payment.providerPaymentIntentId
      : null;

  if (cancelableIntentId) {
    try {
      await cancelOnvoPaymentIntent(cancelableIntentId);
    } catch {
      // La intención pudo cambiar de estado entre la consulta y la cancelación.
      // La consulta autoritativa siguiente decide si se aplicó o continúa abierta.
    }
    await reconcileOnvoPaymentIntent(cancelableIntentId);
  }

  redirect(`/dashboard/subscription/payments/${paymentId}`);
}

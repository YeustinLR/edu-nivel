"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { reconcileOnvoPaymentIntent } from "@/server/payments/onvo/reconcile";

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
    payment.providerPaymentIntentId &&
    Date.now() - payment.updatedAt.getTime() >=
      MINIMUM_RECONCILIATION_INTERVAL_MS
  ) {
    await reconcileOnvoPaymentIntent(payment.providerPaymentIntentId);
  }

  redirect(`/dashboard/subscription/payments/${payment.id}`);
}

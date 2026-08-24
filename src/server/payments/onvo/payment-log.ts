import "server-only";

type PaymentLogInput = {
  event: string;
  outcome: string;
  paymentId?: string | null;
  paymentIntentId?: string | null;
  refundId?: string | null;
  webhookEvent?: string | null;
};

export function logOnvoPaymentEvent(input: PaymentLogInput) {
  console.info(
    JSON.stringify({
      scope: "onvo-payment",
      timestamp: new Date().toISOString(),
      event: input.event,
      outcome: input.outcome,
      paymentId: input.paymentId ?? undefined,
      paymentIntentId: input.paymentIntentId ?? undefined,
      refundId: input.refundId ?? undefined,
      webhookEvent: input.webhookEvent ?? undefined,
    }),
  );
}

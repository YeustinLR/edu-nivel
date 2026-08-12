import type {
  Payment,
  ProviderMode,
} from "@/generated/prisma/client";
import type { OnvoPaymentIntent } from "@/server/payments/onvo/schemas";

export type OnvoVerificationIssueCode =
  | "PROVIDER_MODE_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "RECEIVED_AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "PAYMENT_METHOD_MISMATCH"
  | "PAYMENT_REFERENCE_MISMATCH"
  | "PAYMENT_USER_MISMATCH"
  | "PAYMENT_PLAN_MISMATCH"
  | "PAYMENT_LEVEL_MISMATCH";

type PaymentVerificationSnapshot = Pick<
  Payment,
  | "id"
  | "userId"
  | "levelId"
  | "planCode"
  | "expectedAmountMinor"
  | "currency"
  | "providerMode"
  | "providerPaymentMethodId"
  | "internalReference"
>;

function providerModeValue(mode: ProviderMode): "test" | "live" {
  return mode === "TEST" ? "test" : "live";
}

export function verifyOnvoPaymentIntent(
  payment: PaymentVerificationSnapshot,
  intent: OnvoPaymentIntent,
): OnvoVerificationIssueCode[] {
  const issues: OnvoVerificationIssueCode[] = [];

  if (intent.mode !== providerModeValue(payment.providerMode)) {
    issues.push("PROVIDER_MODE_MISMATCH");
  }

  if (intent.amount !== payment.expectedAmountMinor) {
    issues.push("AMOUNT_MISMATCH");
  }

  if (
    intent.status === "succeeded" &&
    intent.receivedAmount !== payment.expectedAmountMinor
  ) {
    issues.push("RECEIVED_AMOUNT_MISMATCH");
  }

  if (intent.currency !== payment.currency) {
    issues.push("CURRENCY_MISMATCH");
  }

  const providerPaymentMethodId =
    intent.paymentMethodId ?? intent.paymentMethod?.id;

  if (
    payment.providerPaymentMethodId &&
    providerPaymentMethodId !== payment.providerPaymentMethodId
  ) {
    issues.push("PAYMENT_METHOD_MISMATCH");
  }

  if (intent.metadata?.paymentId !== payment.id) {
    issues.push("PAYMENT_REFERENCE_MISMATCH");
  }

  if (intent.metadata?.internalReference !== payment.internalReference) {
    issues.push("PAYMENT_REFERENCE_MISMATCH");
  }

  if (intent.metadata?.userId !== payment.userId) {
    issues.push("PAYMENT_USER_MISMATCH");
  }

  if (intent.metadata?.planCode !== payment.planCode) {
    issues.push("PAYMENT_PLAN_MISMATCH");
  }

  if (intent.metadata?.levelId !== payment.levelId) {
    issues.push("PAYMENT_LEVEL_MISMATCH");
  }

  return [...new Set(issues)];
}

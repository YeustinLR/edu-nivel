export const SINPE_STALE_AFTER_MS = 30 * 60 * 1_000;
export const SINPE_RECONCILIATION_MIN_AGE_MS = 5 * 60 * 1_000;

type PendingPaymentSnapshot = {
  status: "INITIALIZING" | "PROCESSING" | string;
  createdAt: Date;
  staleAt?: Date | null;
};

export function isStaleSinpePayment(
  payment: PendingPaymentSnapshot,
  now = new Date(),
): boolean {
  if (
    payment.status !== "INITIALIZING" &&
    payment.status !== "PROCESSING"
  ) {
    return false;
  }

  return Boolean(
    payment.staleAt ||
      now.getTime() - payment.createdAt.getTime() >= SINPE_STALE_AFTER_MS,
  );
}

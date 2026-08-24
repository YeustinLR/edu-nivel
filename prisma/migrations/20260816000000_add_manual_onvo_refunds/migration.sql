ALTER TYPE "SubscriptionStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

CREATE TYPE "RefundStatus" AS ENUM (
  'REQUESTED',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REQUIRES_REVIEW'
);

CREATE TABLE "payment_refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'ONVO',
  "providerMode" "ProviderMode" NOT NULL,
  "providerRefundId" TEXT,
  "expectedAmountMinor" INTEGER NOT NULL,
  "providerAmountMinor" INTEGER,
  "currency" VARCHAR(3) NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerStatus" TEXT,
  "reason" TEXT,
  "requestedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerCreatedAt" TIMESTAMP(3),
  "providerUpdatedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_refund_providerRefundId_key"
ON "payment_refund"("providerRefundId");

CREATE INDEX "payment_refund_paymentId_status_idx"
ON "payment_refund"("paymentId", "status");

CREATE INDEX "payment_refund_status_updatedAt_idx"
ON "payment_refund"("status", "updatedAt");

CREATE INDEX "payment_refund_requestedById_requestedAt_idx"
ON "payment_refund"("requestedById", "requestedAt");

CREATE UNIQUE INDEX "payment_refund_one_open_per_payment_key"
ON "payment_refund"("paymentId")
WHERE "status" IN ('REQUESTED', 'PENDING', 'REQUIRES_REVIEW');

CREATE UNIQUE INDEX "payment_refund_one_succeeded_per_payment_key"
ON "payment_refund"("paymentId")
WHERE "status" = 'SUCCEEDED';

ALTER TABLE "payment_refund"
ADD CONSTRAINT "payment_refund_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "payment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_refund"
ADD CONSTRAINT "payment_refund_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "webhook_receipt" ADD COLUMN "deduplicationKey" TEXT;
CREATE UNIQUE INDEX "webhook_receipt_deduplicationKey_key"
ON "webhook_receipt"("deduplicationKey");

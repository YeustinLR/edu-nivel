/*
  Warnings:

  - You are about to drop the column `endDate` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,product]` on the table `subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currentPeriodEnd` to the `subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentPeriodStart` to the `subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product` to the `subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('STUDENT_MONTHLY', 'STUDENT_YEARLY', 'TEACHER_MONTHLY', 'TEACHER_YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionProduct" AS ENUM ('STUDENT_PREMIUM', 'TEACHER_PREMIUM');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIALIZING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ONVO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('SINPE_MOBILE');

-- CreateEnum
CREATE TYPE "ProviderMode" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "WebhookOutcome" AS ENUM ('PROCESSED', 'IGNORED', 'REQUIRES_REVIEW', 'FAILED');

-- AlterTable
ALTER TABLE "subscription" DROP COLUMN "endDate",
DROP COLUMN "plan",
DROP COLUMN "startDate",
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastPlanCode" "PlanCode",
ADD COLUMN     "product" "SubscriptionProduct" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "Plan";

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "planCode" "PlanCode" NOT NULL,
    "product" "SubscriptionProduct" NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "roleAtCheckout" "Role" NOT NULL,
    "expectedAmountMinor" INTEGER NOT NULL,
    "receivedAmountMinor" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CRC',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'ONVO',
    "providerMode" "ProviderMode" NOT NULL,
    "providerStatus" TEXT,
    "providerPaymentIntentId" TEXT,
    "providerPaymentMethodId" TEXT,
    "providerChargeId" TEXT,
    "internalReference" TEXT NOT NULL,
    "checkoutRequestId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIALIZING',
    "confirmedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "staleAt" TIMESTAMP(3),
    "payerPhoneLast4" TEXT,
    "payerIdentificationLast4" TEXT,
    "payerIdentificationType" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_receipt" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'ONVO',
    "eventType" TEXT NOT NULL,
    "providerObjectId" TEXT,
    "payloadHash" TEXT,
    "outcome" "WebhookOutcome" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorCode" TEXT,

    CONSTRAINT "webhook_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerPaymentIntentId_key" ON "payment"("providerPaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_internalReference_key" ON "payment"("internalReference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_checkoutRequestId_key" ON "payment"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "payment_userId_status_idx" ON "payment"("userId", "status");

-- CreateIndex
CREATE INDEX "payment_subscriptionId_idx" ON "payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "payment_providerStatus_idx" ON "payment"("providerStatus");

-- CreateIndex
CREATE INDEX "payment_createdAt_idx" ON "payment"("createdAt");

-- CreateIndex
CREATE INDEX "webhook_receipt_provider_providerObjectId_idx" ON "webhook_receipt"("provider", "providerObjectId");

-- CreateIndex
CREATE INDEX "webhook_receipt_payloadHash_idx" ON "webhook_receipt"("payloadHash");

-- CreateIndex
CREATE INDEX "webhook_receipt_receivedAt_idx" ON "webhook_receipt"("receivedAt");

-- CreateIndex
CREATE INDEX "subscription_currentPeriodEnd_idx" ON "subscription"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_userId_product_key" ON "subscription"("userId", "product");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

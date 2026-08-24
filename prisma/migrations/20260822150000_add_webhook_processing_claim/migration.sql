ALTER TYPE "WebhookOutcome" ADD VALUE 'PROCESSING';

ALTER TABLE "webhook_receipt"
ADD COLUMN "processingStartedAt" TIMESTAMP(3);

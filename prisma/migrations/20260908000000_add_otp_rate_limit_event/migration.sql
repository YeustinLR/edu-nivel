CREATE TABLE "otp_rate_limit_event" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "emailHash" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_rate_limit_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otp_rate_limit_event_operation_emailHash_createdAt_idx"
ON "otp_rate_limit_event"("operation", "emailHash", "createdAt");

CREATE INDEX "otp_rate_limit_event_category_ipHash_createdAt_idx"
ON "otp_rate_limit_event"("category", "ipHash", "createdAt");

CREATE INDEX "otp_rate_limit_event_createdAt_idx"
ON "otp_rate_limit_event"("createdAt");

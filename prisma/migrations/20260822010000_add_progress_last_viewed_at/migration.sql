ALTER TABLE "resource_progress"
ADD COLUMN "lastViewedAt" TIMESTAMP(3);

UPDATE "resource_progress"
SET "lastViewedAt" = "startedAt";

ALTER TABLE "resource_progress"
ALTER COLUMN "lastViewedAt" SET NOT NULL,
ALTER COLUMN "lastViewedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "resource_progress_userId_lastViewedAt_idx"
ON "resource_progress"("userId", "lastViewedAt");

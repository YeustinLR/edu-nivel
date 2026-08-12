ALTER TABLE "user"
ADD COLUMN "adminCreatedAt" TIMESTAMP(3),
ADD COLUMN "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "user_deletedAt_idx" ON "user"("deletedAt");

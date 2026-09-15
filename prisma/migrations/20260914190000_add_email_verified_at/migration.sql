ALTER TABLE "user"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Admin-created accounts are verified at creation, so their timestamp is known.
UPDATE "user"
SET "emailVerifiedAt" = "adminCreatedAt"
WHERE "emailVerified" = true
  AND "adminCreatedAt" IS NOT NULL;

CREATE INDEX "user_emailVerifiedAt_idx" ON "user"("emailVerifiedAt");

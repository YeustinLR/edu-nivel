DROP INDEX IF EXISTS "payment_one_open_per_user_level_key";

CREATE UNIQUE INDEX "payment_one_open_per_user_level_mode_key"
ON "payment" ("userId", "levelId", "providerMode")
WHERE "status" IN ('INITIALIZING', 'PROCESSING', 'REQUIRES_REVIEW');

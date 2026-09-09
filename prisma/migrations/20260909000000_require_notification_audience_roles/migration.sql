UPDATE "notification"
SET "audienceRoles" = ARRAY[]::"Role"[]
WHERE "audienceRoles" IS NULL;

ALTER TABLE "notification"
ALTER COLUMN "audienceRoles" SET NOT NULL;

ALTER TABLE "payment"
ADD COLUMN "levelNumberSnapshot" INTEGER;

UPDATE "payment" AS p
SET "levelNumberSnapshot" = l."levelNumber"
FROM "level" AS l
WHERE p."levelId" = l."id";

ALTER TABLE "payment"
DROP CONSTRAINT "payment_levelId_fkey";

ALTER TABLE "payment"
ALTER COLUMN "levelId" DROP NOT NULL;

ALTER TABLE "payment"
ADD CONSTRAINT "payment_levelId_fkey"
FOREIGN KEY ("levelId") REFERENCES "level"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

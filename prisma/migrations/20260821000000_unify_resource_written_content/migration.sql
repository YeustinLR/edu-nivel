-- Promote written educational content to the base resource so it can coexist
-- with an optional YouTube video, link, PDF, or image attachment.
ALTER TABLE "resource"
ADD COLUMN "content" TEXT,
ADD COLUMN "estimatedMinutes" INTEGER;

ALTER TABLE "upload_intent"
ADD COLUMN "content" TEXT,
ADD COLUMN "estimatedMinutes" INTEGER;

-- Preserve existing lesson bodies and reading times.
UPDATE "resource" AS resource
SET
  "content" = lesson."content",
  "estimatedMinutes" = lesson."estimatedMinutes"
FROM "lesson" AS lesson
WHERE lesson."resourceId" = resource."id";

-- Preserve legacy didactic objectives inside the generic written body.
UPDATE "resource" AS resource
SET "content" = CASE
  WHEN didactic."objective" IS NULL OR btrim(didactic."objective") = ''
    THEN didactic."content"
  ELSE concat('Objetivo: ', didactic."objective", E'\n\n', didactic."content")
END
FROM "didactic_resource" AS didactic
WHERE didactic."resourceId" = resource."id";

-- A resource without an external attachment is represented by NOTE.
UPDATE "resource"
SET "type" = 'NOTE'
WHERE "type" IN ('LESSON', 'DIDACTIC');

UPDATE "upload_intent"
SET "resourceType" = 'NOTE'
WHERE "resourceType" IN ('LESSON', 'DIDACTIC');

DROP TABLE "lesson";
DROP TABLE "didactic_resource";

-- PostgreSQL enums cannot drop values directly, so rebuild the enum after
-- all rows have been converted to supported resource types.
ALTER TYPE "ResourceType" RENAME TO "ResourceType_old";
CREATE TYPE "ResourceType" AS ENUM (
  'NOTE',
  'QUIZ',
  'YOUTUBE',
  'PDF',
  'FILE',
  'LINK',
  'GAME',
  'IMAGE',
  'AUDIO'
);

ALTER TABLE "resource"
ALTER COLUMN "type" TYPE "ResourceType"
USING "type"::text::"ResourceType";

ALTER TABLE "upload_intent"
ALTER COLUMN "resourceType" TYPE "ResourceType"
USING "resourceType"::text::"ResourceType";

DROP TYPE "ResourceType_old";

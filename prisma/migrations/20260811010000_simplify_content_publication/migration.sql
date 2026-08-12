ALTER TABLE "upload_intent"
ADD COLUMN "targetPublicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "module"
SET
  "publicationStatus" = 'DRAFT',
  "submittedForReviewAt" = NULL,
  "reviewedById" = NULL,
  "reviewedAt" = NULL,
  "reviewNote" = NULL
WHERE "publicationStatus" = 'IN_REVIEW';

UPDATE "resource" AS resource
SET
  "publicationStatus" = 'DRAFT',
  "submittedForReviewAt" = NULL,
  "reviewedById" = NULL,
  "reviewedAt" = NULL,
  "reviewNote" = NULL
FROM "user" AS creator
WHERE
  resource."createdById" = creator."id"
  AND creator."role" = 'ADMIN'
  AND resource."publicationStatus" = 'IN_REVIEW';

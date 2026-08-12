-- CreateEnum
CREATE TYPE "ContentAudience" AS ENUM ('STUDENT', 'TEACHER', 'BOTH');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'PUBLISHED',
    'UNPUBLISHED'
);

-- Rename the navigation-only level selection while preserving existing values.
ALTER TABLE "user" RENAME COLUMN "currentLevelId" TO "selectedLevelId";
ALTER TABLE "user" RENAME CONSTRAINT "user_currentLevelId_fkey" TO "user_selectedLevelId_fkey";

-- Levels are premium by default. Explicitly opt a level into free access.
ALTER TABLE "level"
ADD COLUMN "requiresSubscription" BOOLEAN NOT NULL DEFAULT true;

-- A subscription is the access right for one user and one level.
DROP INDEX "subscription_userId_product_key";
ALTER TABLE "subscription"
ADD COLUMN "levelId" TEXT NOT NULL;

CREATE INDEX "subscription_levelId_idx" ON "subscription"("levelId");
CREATE UNIQUE INDEX "subscription_userId_levelId_key"
ON "subscription"("userId", "levelId");

ALTER TABLE "subscription"
ADD CONSTRAINT "subscription_levelId_fkey"
FOREIGN KEY ("levelId") REFERENCES "level"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- The payment snapshot is the source of truth for the purchased level.
ALTER TABLE "payment"
ADD COLUMN "levelId" TEXT NOT NULL;

CREATE INDEX "payment_levelId_idx" ON "payment"("levelId");

ALTER TABLE "payment"
ADD CONSTRAINT "payment_levelId_fkey"
FOREIGN KEY ("levelId") REFERENCES "level"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Editorial workflow for modules.
ALTER TABLE "module"
ADD COLUMN "audience" "ContentAudience" NOT NULL DEFAULT 'BOTH',
ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "createdById" TEXT NOT NULL,
ADD COLUMN "submittedForReviewAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "publishedById" TEXT,
ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "module_createdById_idx" ON "module"("createdById");
CREATE INDEX "module_publicationStatus_idx" ON "module"("publicationStatus");
CREATE INDEX "module_audience_idx" ON "module"("audience");

ALTER TABLE "module"
ADD CONSTRAINT "module_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "module"
ADD CONSTRAINT "module_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "module"
ADD CONSTRAINT "module_publishedById_fkey"
FOREIGN KEY ("publishedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Editorial workflow for resources.
ALTER TABLE "resource"
ADD COLUMN "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "createdById" TEXT NOT NULL,
ADD COLUMN "submittedForReviewAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "publishedById" TEXT,
ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "resource_createdById_idx" ON "resource"("createdById");
CREATE INDEX "resource_publicationStatus_idx"
ON "resource"("publicationStatus");

ALTER TABLE "resource"
ADD CONSTRAINT "resource_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "resource"
ADD CONSTRAINT "resource_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resource"
ADD CONSTRAINT "resource_publishedById_fkey"
FOREIGN KEY ("publishedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

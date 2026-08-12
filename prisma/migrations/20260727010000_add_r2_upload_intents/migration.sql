-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'CONFIRMED',
    'CLEANUP_PENDING',
    'FAILED',
    'EXPIRED'
);

-- CreateTable
CREATE TABLE "upload_intent" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "reservedResourceId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "originalName" TEXT NOT NULL,
    "altText" TEXT,
    "temporaryStorageKey" TEXT NOT NULL,
    "permanentStorageKey" TEXT NOT NULL,
    "expectedMimeType" TEXT NOT NULL,
    "expectedSizeBytes" BIGINT NOT NULL,
    "temporaryObjectEtag" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "cleanupLeaseUntil" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_intent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "resource"
ADD COLUMN "uploadIntentId" TEXT;

CREATE UNIQUE INDEX "upload_intent_reservedResourceId_key"
ON "upload_intent"("reservedResourceId");

CREATE UNIQUE INDEX "upload_intent_temporaryStorageKey_key"
ON "upload_intent"("temporaryStorageKey");

CREATE UNIQUE INDEX "upload_intent_permanentStorageKey_key"
ON "upload_intent"("permanentStorageKey");

CREATE INDEX "upload_intent_createdById_idx"
ON "upload_intent"("createdById");

CREATE INDEX "upload_intent_moduleId_idx"
ON "upload_intent"("moduleId");

CREATE INDEX "upload_intent_status_expiresAt_idx"
ON "upload_intent"("status", "expiresAt");

CREATE INDEX "upload_intent_cleanupLeaseUntil_idx"
ON "upload_intent"("cleanupLeaseUntil");

CREATE UNIQUE INDEX "resource_uploadIntentId_key"
ON "resource"("uploadIntentId");

ALTER TABLE "upload_intent"
ADD CONSTRAINT "upload_intent_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "upload_intent"
ADD CONSTRAINT "upload_intent_moduleId_fkey"
FOREIGN KEY ("moduleId") REFERENCES "module"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "resource"
ADD CONSTRAINT "resource_uploadIntentId_fkey"
FOREIGN KEY ("uploadIntentId") REFERENCES "upload_intent"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

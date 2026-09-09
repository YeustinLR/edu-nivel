ALTER TABLE "upload_intent"
ADD COLUMN "editorSessionId" TEXT;

UPDATE "upload_intent"
SET "editorSessionId" = "reservedResourceId"
WHERE "editorSessionId" IS NULL;

ALTER TABLE "upload_intent"
ALTER COLUMN "editorSessionId" SET NOT NULL;

CREATE TABLE "content_image" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "editorSessionId" TEXT NOT NULL,
    "temporaryStorageKey" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "temporaryObjectEtag" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "uploadExpiresAt" TIMESTAMP(3) NOT NULL,
    "orphanExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "cleanupLeaseUntil" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_image_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_content_image" (
    "resourceId" TEXT NOT NULL,
    "contentImageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_content_image_pkey" PRIMARY KEY ("resourceId", "contentImageId")
);

CREATE UNIQUE INDEX "content_image_temporaryStorageKey_key" ON "content_image"("temporaryStorageKey");
CREATE UNIQUE INDEX "content_image_storageKey_key" ON "content_image"("storageKey");
CREATE INDEX "content_image_createdById_editorSessionId_idx" ON "content_image"("createdById", "editorSessionId");
CREATE INDEX "content_image_status_uploadExpiresAt_idx" ON "content_image"("status", "uploadExpiresAt");
CREATE INDEX "content_image_orphanExpiresAt_idx" ON "content_image"("orphanExpiresAt");
CREATE INDEX "content_image_cleanupLeaseUntil_idx" ON "content_image"("cleanupLeaseUntil");
CREATE INDEX "resource_content_image_contentImageId_idx" ON "resource_content_image"("contentImageId");

ALTER TABLE "content_image"
ADD CONSTRAINT "content_image_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "resource_content_image"
ADD CONSTRAINT "resource_content_image_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_content_image"
ADD CONSTRAINT "resource_content_image_contentImageId_fkey"
FOREIGN KEY ("contentImageId") REFERENCES "content_image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

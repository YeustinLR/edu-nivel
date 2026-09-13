CREATE TABLE "storage_object_cleanup" (
  "id" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "storage_object_cleanup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storage_object_cleanup_storageKey_key"
ON "storage_object_cleanup"("storageKey");

CREATE INDEX "storage_object_cleanup_createdAt_idx"
ON "storage_object_cleanup"("createdAt");

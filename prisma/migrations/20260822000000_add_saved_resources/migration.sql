CREATE TABLE "saved_resource" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "saved_resource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_resource_userId_resourceId_key"
ON "saved_resource"("userId", "resourceId");

CREATE INDEX "saved_resource_userId_createdAt_idx"
ON "saved_resource"("userId", "createdAt");

CREATE INDEX "saved_resource_resourceId_idx"
ON "saved_resource"("resourceId");

ALTER TABLE "saved_resource"
ADD CONSTRAINT "saved_resource_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_resource"
ADD CONSTRAINT "saved_resource_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "resource"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

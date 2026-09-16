CREATE TYPE "ContentRevisionKind" AS ENUM ('MODULE', 'RESOURCE');
CREATE TYPE "ContentRevisionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED');

CREATE TABLE "content_revision" (
    "id" TEXT NOT NULL,
    "kind" "ContentRevisionKind" NOT NULL,
    "status" "ContentRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "moduleId" TEXT,
    "resourceId" TEXT,
    "payload" JSONB NOT NULL,
    "baseUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "content_revision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_revision_exactly_one_target" CHECK (
      ("kind" = 'MODULE' AND "moduleId" IS NOT NULL AND "resourceId" IS NULL) OR
      ("kind" = 'RESOURCE' AND "resourceId" IS NOT NULL AND "moduleId" IS NULL)
    )
);

ALTER TABLE "module" ADD COLUMN "updatedById" TEXT,
ADD COLUMN "submittedById" TEXT;
ALTER TABLE "resource" ADD COLUMN "updatedById" TEXT,
ADD COLUMN "submittedById" TEXT;

CREATE TABLE "content_audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" "ContentRevisionKind" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "revisionId" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_revision_moduleId_key" ON "content_revision"("moduleId");
CREATE UNIQUE INDEX "content_revision_resourceId_key" ON "content_revision"("resourceId");
CREATE INDEX "content_revision_kind_status_updatedAt_idx" ON "content_revision"("kind", "status", "updatedAt");
CREATE INDEX "content_revision_createdById_status_idx" ON "content_revision"("createdById", "status");
CREATE INDEX "content_revision_updatedById_updatedAt_idx" ON "content_revision"("updatedById", "updatedAt");
CREATE INDEX "content_audit_log_entityId_createdAt_idx" ON "content_audit_log"("entityId", "createdAt");
CREATE INDEX "content_audit_log_actorId_createdAt_idx" ON "content_audit_log"("actorId", "createdAt");
CREATE INDEX "content_audit_log_action_createdAt_idx" ON "content_audit_log"("action", "createdAt");
CREATE INDEX "module_updatedById_idx" ON "module"("updatedById");
CREATE INDEX "module_submittedById_idx" ON "module"("submittedById");
CREATE INDEX "resource_updatedById_idx" ON "resource"("updatedById");
CREATE INDEX "resource_submittedById_idx" ON "resource"("submittedById");

ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_audit_log" ADD CONSTRAINT "content_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "module" ADD CONSTRAINT "module_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "module" ADD CONSTRAINT "module_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource" ADD CONSTRAINT "resource_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource" ADD CONSTRAINT "resource_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

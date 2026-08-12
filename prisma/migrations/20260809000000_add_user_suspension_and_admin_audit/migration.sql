ALTER TABLE "user"
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspensionReason" TEXT,
ADD COLUMN "suspensionExpiresAt" TIMESTAMP(3);

CREATE TABLE "admin_audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_log_actorId_createdAt_idx"
ON "admin_audit_log"("actorId", "createdAt");

CREATE INDEX "admin_audit_log_targetUserId_createdAt_idx"
ON "admin_audit_log"("targetUserId", "createdAt");

CREATE INDEX "admin_audit_log_action_createdAt_idx"
ON "admin_audit_log"("action", "createdAt");

ALTER TABLE "admin_audit_log"
ADD CONSTRAINT "admin_audit_log_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admin_audit_log"
ADD CONSTRAINT "admin_audit_log_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

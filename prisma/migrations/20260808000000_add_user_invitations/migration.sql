-- Administrative invitations store only a hash of the bearer token.
-- `activeEmail` enforces at most one usable invitation per normalized email.
CREATE TABLE "user_invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "activeEmail" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "selectedLevelId" TEXT,
    "invitedById" TEXT NOT NULL,
    "acceptedUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_invitation_activeEmail_key"
ON "user_invitation"("activeEmail");

CREATE UNIQUE INDEX "user_invitation_tokenHash_key"
ON "user_invitation"("tokenHash");

CREATE UNIQUE INDEX "user_invitation_acceptedUserId_key"
ON "user_invitation"("acceptedUserId");

CREATE INDEX "user_invitation_email_idx"
ON "user_invitation"("email");

CREATE INDEX "user_invitation_expiresAt_idx"
ON "user_invitation"("expiresAt");

CREATE INDEX "user_invitation_invitedById_idx"
ON "user_invitation"("invitedById");

CREATE INDEX "user_invitation_selectedLevelId_idx"
ON "user_invitation"("selectedLevelId");

ALTER TABLE "user_invitation"
ADD CONSTRAINT "user_invitation_selectedLevelId_fkey"
FOREIGN KEY ("selectedLevelId") REFERENCES "level"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_invitation"
ADD CONSTRAINT "user_invitation_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_invitation"
ADD CONSTRAINT "user_invitation_acceptedUserId_fkey"
FOREIGN KEY ("acceptedUserId") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "NotificationType" AS ENUM ('GENERAL_ALERT', 'IMPORTANT_NOTICE', 'SUBSCRIPTION_RENEWAL');
CREATE TYPE "NotificationAudienceMode" AS ENUM ('SELECTED_USERS', 'ALL_USERS', 'ROLES', 'SUBSCRIPTIONS');

CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "sentById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audienceMode" "NotificationAudienceMode" NOT NULL,
    "audienceRoles" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "requestId" UUID NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "resendOfRecipientId" TEXT,
    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_recipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "periodEndSnapshot" TIMESTAMP(3),
    "levelNumberSnapshot" INTEGER,
    "initialReminderKey" TEXT,
    CONSTRAINT "notification_recipient_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_recipient_subscription_snapshot_check" CHECK (
      ("subscriptionId" IS NULL AND "periodEndSnapshot" IS NULL AND "levelNumberSnapshot" IS NULL AND "initialReminderKey" IS NULL)
      OR ("subscriptionId" IS NOT NULL AND "periodEndSnapshot" IS NOT NULL AND "levelNumberSnapshot" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "notification_requestId_key" ON "notification"("requestId");
CREATE UNIQUE INDEX "notification_resendOfRecipientId_key" ON "notification"("resendOfRecipientId");
CREATE INDEX "notification_sentAt_id_idx" ON "notification"("sentAt", "id");
CREATE INDEX "notification_sentById_sentAt_idx" ON "notification"("sentById", "sentAt");
CREATE INDEX "notification_type_sentAt_idx" ON "notification"("type", "sentAt");
CREATE UNIQUE INDEX "notification_recipient_initialReminderKey_key" ON "notification_recipient"("initialReminderKey");
CREATE UNIQUE INDEX "notification_recipient_notificationId_targetKey_key" ON "notification_recipient"("notificationId", "targetKey");
CREATE INDEX "notification_recipient_userId_receivedAt_id_idx" ON "notification_recipient"("userId", "receivedAt", "id");
CREATE INDEX "notification_recipient_userId_readAt_receivedAt_id_idx" ON "notification_recipient"("userId", "readAt", "receivedAt", "id");
CREATE INDEX "notification_recipient_subscriptionId_periodEndSnapshot_idx" ON "notification_recipient"("subscriptionId", "periodEndSnapshot");

ALTER TABLE "notification" ADD CONSTRAINT "notification_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_resendOfRecipientId_fkey" FOREIGN KEY ("resendOfRecipientId") REFERENCES "notification_recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

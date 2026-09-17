-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'COLLABORATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL_ALERT', 'IMPORTANT_NOTICE', 'SUBSCRIPTION_RENEWAL');

-- CreateEnum
CREATE TYPE "NotificationAudienceMode" AS ENUM ('SELECTED_USERS', 'ALL_USERS', 'ROLES', 'SUBSCRIPTIONS');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('STUDENT_MONTHLY', 'STUDENT_YEARLY', 'TEACHER_MONTHLY', 'TEACHER_YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionProduct" AS ENUM ('STUDENT_PREMIUM', 'TEACHER_PREMIUM');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIALIZING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REQUIRES_REVIEW', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PENDING', 'SUCCEEDED', 'FAILED', 'REQUIRES_REVIEW', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ONVO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('SINPE_MOBILE');

-- CreateEnum
CREATE TYPE "ProviderMode" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "WebhookOutcome" AS ENUM ('PROCESSED', 'IGNORED', 'REQUIRES_REVIEW', 'FAILED', 'PROCESSING');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('NOTE', 'QUIZ', 'YOUTUBE', 'PDF', 'FILE', 'LINK', 'GAME', 'IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "ContentAudience" AS ENUM ('STUDENT', 'TEACHER', 'BOTH');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "ContentRevisionKind" AS ENUM ('MODULE', 'RESOURCE');

-- CreateEnum
CREATE TYPE "ContentRevisionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'CLEANUP_PENDING', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "image" TEXT,
    "birthDate" TIMESTAMP(3),
    "ageDeclared" INTEGER,
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyAcceptedAt" TIMESTAMP(3),
    "ageVerifiedAt" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "suspensionExpiresAt" TIMESTAMP(3),
    "adminCreatedAt" TIMESTAMP(3),
    "invitationPending" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "selectedLevelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_rate_limit_event" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "emailHash" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_rate_limit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "product" "SubscriptionProduct" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "lastPlanCode" "PlanCode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "sentById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audienceMode" "NotificationAudienceMode" NOT NULL,
    "audienceRoles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[],
    "requestId" UUID NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "resendOfRecipientId" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "notification_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT,
    "levelNumberSnapshot" INTEGER,
    "subscriptionId" TEXT,
    "planCode" "PlanCode" NOT NULL,
    "product" "SubscriptionProduct" NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "roleAtCheckout" "Role" NOT NULL,
    "expectedAmountMinor" INTEGER NOT NULL,
    "receivedAmountMinor" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CRC',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'ONVO',
    "method" "PaymentMethod" NOT NULL DEFAULT 'SINPE_MOBILE',
    "providerMode" "ProviderMode" NOT NULL,
    "providerStatus" TEXT,
    "providerPaymentIntentId" TEXT,
    "providerPaymentMethodId" TEXT,
    "providerChargeId" TEXT,
    "internalReference" TEXT NOT NULL,
    "checkoutRequestId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIALIZING',
    "confirmedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "staleAt" TIMESTAMP(3),
    "payerPhoneLast4" TEXT,
    "payerIdentificationLast4" TEXT,
    "payerIdentificationType" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'ONVO',
    "providerMode" "ProviderMode" NOT NULL,
    "providerRefundId" TEXT,
    "expectedAmountMinor" INTEGER NOT NULL,
    "providerAmountMinor" INTEGER,
    "currency" VARCHAR(3) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "providerStatus" TEXT,
    "reason" TEXT,
    "requestedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerCreatedAt" TIMESTAMP(3),
    "providerUpdatedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_receipt" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'ONVO',
    "eventType" TEXT NOT NULL,
    "providerObjectId" TEXT,
    "payloadHash" TEXT,
    "deduplicationKey" TEXT,
    "outcome" "WebhookOutcome" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "errorCode" TEXT,

    CONSTRAINT "webhook_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level" (
    "id" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "description" TEXT,
    "requiresSubscription" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "levelId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT NOT NULL,
    "audience" "ContentAudience" NOT NULL DEFAULT 'BOTH',
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "submittedForReviewAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "content" TEXT,
    "estimatedMinutes" INTEGER,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "submittedForReviewAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "uploadIntentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "content_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "upload_intent" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "reservedResourceId" TEXT NOT NULL,
    "editorSessionId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "targetPublicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "content" TEXT,
    "estimatedMinutes" INTEGER,
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "resource_content_image" (
    "resourceId" TEXT NOT NULL,
    "contentImageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_content_image_pkey" PRIMARY KEY ("resourceId","contentImageId")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "maxAttempts" INTEGER,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "questions" JSONB NOT NULL,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "questionsSnapshot" JSONB NOT NULL,
    "answers" JSONB,
    "questionCount" INTEGER NOT NULL,
    "correctAnswers" INTEGER,
    "percentage" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_video" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "duration" INTEGER,
    "startAt" INTEGER DEFAULT 0,
    "endAt" INTEGER,

    CONSTRAINT "youtube_video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_resource" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "pageCount" INTEGER,

    CONSTRAINT "pdf_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_resource" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT,

    CONSTRAINT "file_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_resource" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "link_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_resource" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "game_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_resource" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "caption" TEXT,

    CONSTRAINT "image_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_resource" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "duration" INTEGER,
    "transcript" TEXT,

    CONSTRAINT "audio_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_resource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_deletedAt_idx" ON "user"("deletedAt");

-- CreateIndex
CREATE INDEX "user_emailVerifiedAt_idx" ON "user"("emailVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- CreateIndex
CREATE INDEX "otp_rate_limit_event_operation_emailHash_createdAt_idx" ON "otp_rate_limit_event"("operation", "emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "otp_rate_limit_event_category_ipHash_createdAt_idx" ON "otp_rate_limit_event"("category", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "otp_rate_limit_event_createdAt_idx" ON "otp_rate_limit_event"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_actorId_createdAt_idx" ON "admin_audit_log"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_targetUserId_createdAt_idx" ON "admin_audit_log"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_action_createdAt_idx" ON "admin_audit_log"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitation_activeEmail_key" ON "user_invitation"("activeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitation_tokenHash_key" ON "user_invitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitation_acceptedUserId_key" ON "user_invitation"("acceptedUserId");

-- CreateIndex
CREATE INDEX "user_invitation_email_idx" ON "user_invitation"("email");

-- CreateIndex
CREATE INDEX "user_invitation_expiresAt_idx" ON "user_invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "user_invitation_invitedById_idx" ON "user_invitation"("invitedById");

-- CreateIndex
CREATE INDEX "user_invitation_selectedLevelId_idx" ON "user_invitation"("selectedLevelId");

-- CreateIndex
CREATE INDEX "subscription_userId_idx" ON "subscription"("userId");

-- CreateIndex
CREATE INDEX "subscription_levelId_idx" ON "subscription"("levelId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "subscription_currentPeriodEnd_idx" ON "subscription"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_userId_levelId_key" ON "subscription"("userId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_requestId_key" ON "notification"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_resendOfRecipientId_key" ON "notification"("resendOfRecipientId");

-- CreateIndex
CREATE INDEX "notification_sentAt_id_idx" ON "notification"("sentAt", "id");

-- CreateIndex
CREATE INDEX "notification_sentById_sentAt_idx" ON "notification"("sentById", "sentAt");

-- CreateIndex
CREATE INDEX "notification_type_sentAt_idx" ON "notification"("type", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipient_initialReminderKey_key" ON "notification_recipient"("initialReminderKey");

-- CreateIndex
CREATE INDEX "notification_recipient_userId_receivedAt_id_idx" ON "notification_recipient"("userId", "receivedAt", "id");

-- CreateIndex
CREATE INDEX "notification_recipient_userId_readAt_receivedAt_id_idx" ON "notification_recipient"("userId", "readAt", "receivedAt", "id");

-- CreateIndex
CREATE INDEX "notification_recipient_subscriptionId_periodEndSnapshot_idx" ON "notification_recipient"("subscriptionId", "periodEndSnapshot");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipient_notificationId_targetKey_key" ON "notification_recipient"("notificationId", "targetKey");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerPaymentIntentId_key" ON "payment"("providerPaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_internalReference_key" ON "payment"("internalReference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_checkoutRequestId_key" ON "payment"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "payment_userId_status_idx" ON "payment"("userId", "status");

-- CreateIndex
CREATE INDEX "payment_levelId_idx" ON "payment"("levelId");

-- CreateIndex
CREATE INDEX "payment_subscriptionId_idx" ON "payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "payment_providerStatus_idx" ON "payment"("providerStatus");

-- CreateIndex
CREATE INDEX "payment_createdAt_idx" ON "payment"("createdAt");

-- CreateIndex
CREATE INDEX "payment_providerMode_status_appliedAt_idx" ON "payment"("providerMode", "status", "appliedAt");

-- CreateIndex
CREATE INDEX "payment_providerMode_createdAt_id_idx" ON "payment"("providerMode", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refund_providerRefundId_key" ON "payment_refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "payment_refund_paymentId_status_idx" ON "payment_refund"("paymentId", "status");

-- CreateIndex
CREATE INDEX "payment_refund_status_updatedAt_idx" ON "payment_refund"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "payment_refund_requestedById_requestedAt_idx" ON "payment_refund"("requestedById", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_receipt_deduplicationKey_key" ON "webhook_receipt"("deduplicationKey");

-- CreateIndex
CREATE INDEX "webhook_receipt_provider_providerObjectId_idx" ON "webhook_receipt"("provider", "providerObjectId");

-- CreateIndex
CREATE INDEX "webhook_receipt_payloadHash_idx" ON "webhook_receipt"("payloadHash");

-- CreateIndex
CREATE INDEX "webhook_receipt_receivedAt_idx" ON "webhook_receipt"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "level_levelNumber_key" ON "level"("levelNumber");

-- CreateIndex
CREATE INDEX "subject_levelId_idx" ON "subject"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_levelId_name_key" ON "subject"("levelId", "name");

-- CreateIndex
CREATE INDEX "module_subjectId_idx" ON "module"("subjectId");

-- CreateIndex
CREATE INDEX "module_createdById_idx" ON "module"("createdById");

-- CreateIndex
CREATE INDEX "module_updatedById_idx" ON "module"("updatedById");

-- CreateIndex
CREATE INDEX "module_submittedById_idx" ON "module"("submittedById");

-- CreateIndex
CREATE INDEX "module_publicationStatus_idx" ON "module"("publicationStatus");

-- CreateIndex
CREATE INDEX "module_audience_idx" ON "module"("audience");

-- CreateIndex
CREATE UNIQUE INDEX "module_subjectId_title_key" ON "module"("subjectId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "resource_uploadIntentId_key" ON "resource"("uploadIntentId");

-- CreateIndex
CREATE INDEX "resource_moduleId_idx" ON "resource"("moduleId");

-- CreateIndex
CREATE INDEX "resource_type_idx" ON "resource"("type");

-- CreateIndex
CREATE INDEX "resource_createdById_idx" ON "resource"("createdById");

-- CreateIndex
CREATE INDEX "resource_updatedById_idx" ON "resource"("updatedById");

-- CreateIndex
CREATE INDEX "resource_submittedById_idx" ON "resource"("submittedById");

-- CreateIndex
CREATE INDEX "resource_publicationStatus_idx" ON "resource"("publicationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "content_revision_moduleId_key" ON "content_revision"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "content_revision_resourceId_key" ON "content_revision"("resourceId");

-- CreateIndex
CREATE INDEX "content_revision_kind_status_updatedAt_idx" ON "content_revision"("kind", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "content_revision_createdById_status_idx" ON "content_revision"("createdById", "status");

-- CreateIndex
CREATE INDEX "content_revision_updatedById_updatedAt_idx" ON "content_revision"("updatedById", "updatedAt");

-- CreateIndex
CREATE INDEX "content_audit_log_entityId_createdAt_idx" ON "content_audit_log"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "content_audit_log_actorId_createdAt_idx" ON "content_audit_log"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "content_audit_log_action_createdAt_idx" ON "content_audit_log"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upload_intent_reservedResourceId_key" ON "upload_intent"("reservedResourceId");

-- CreateIndex
CREATE UNIQUE INDEX "upload_intent_temporaryStorageKey_key" ON "upload_intent"("temporaryStorageKey");

-- CreateIndex
CREATE UNIQUE INDEX "upload_intent_permanentStorageKey_key" ON "upload_intent"("permanentStorageKey");

-- CreateIndex
CREATE INDEX "upload_intent_createdById_idx" ON "upload_intent"("createdById");

-- CreateIndex
CREATE INDEX "upload_intent_moduleId_idx" ON "upload_intent"("moduleId");

-- CreateIndex
CREATE INDEX "upload_intent_status_expiresAt_idx" ON "upload_intent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "upload_intent_cleanupLeaseUntil_idx" ON "upload_intent"("cleanupLeaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "content_image_temporaryStorageKey_key" ON "content_image"("temporaryStorageKey");

-- CreateIndex
CREATE UNIQUE INDEX "content_image_storageKey_key" ON "content_image"("storageKey");

-- CreateIndex
CREATE INDEX "content_image_createdById_editorSessionId_idx" ON "content_image"("createdById", "editorSessionId");

-- CreateIndex
CREATE INDEX "content_image_status_uploadExpiresAt_idx" ON "content_image"("status", "uploadExpiresAt");

-- CreateIndex
CREATE INDEX "content_image_orphanExpiresAt_idx" ON "content_image"("orphanExpiresAt");

-- CreateIndex
CREATE INDEX "content_image_cleanupLeaseUntil_idx" ON "content_image"("cleanupLeaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "storage_object_cleanup_storageKey_key" ON "storage_object_cleanup"("storageKey");

-- CreateIndex
CREATE INDEX "storage_object_cleanup_createdAt_idx" ON "storage_object_cleanup"("createdAt");

-- CreateIndex
CREATE INDEX "resource_content_image_contentImageId_idx" ON "resource_content_image"("contentImageId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_resourceId_key" ON "quiz"("resourceId");

-- CreateIndex
CREATE INDEX "quiz_attempt_userId_quizId_startedAt_idx" ON "quiz_attempt"("userId", "quizId", "startedAt");

-- CreateIndex
CREATE INDEX "quiz_attempt_quizId_status_idx" ON "quiz_attempt"("quizId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_video_resourceId_key" ON "youtube_video"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_resource_resourceId_key" ON "pdf_resource"("resourceId");

-- CreateIndex
CREATE INDEX "pdf_resource_storageKey_idx" ON "pdf_resource"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "file_resource_resourceId_key" ON "file_resource"("resourceId");

-- CreateIndex
CREATE INDEX "file_resource_storageKey_idx" ON "file_resource"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "link_resource_resourceId_key" ON "link_resource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "game_resource_resourceId_key" ON "game_resource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "image_resource_resourceId_key" ON "image_resource"("resourceId");

-- CreateIndex
CREATE INDEX "image_resource_storageKey_idx" ON "image_resource"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "audio_resource_resourceId_key" ON "audio_resource"("resourceId");

-- CreateIndex
CREATE INDEX "audio_resource_storageKey_idx" ON "audio_resource"("storageKey");

-- CreateIndex
CREATE INDEX "resource_progress_userId_idx" ON "resource_progress"("userId");

-- CreateIndex
CREATE INDEX "resource_progress_userId_lastViewedAt_idx" ON "resource_progress"("userId", "lastViewedAt");

-- CreateIndex
CREATE INDEX "resource_progress_resourceId_idx" ON "resource_progress"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_progress_userId_resourceId_key" ON "resource_progress"("userId", "resourceId");

-- CreateIndex
CREATE INDEX "saved_resource_userId_createdAt_idx" ON "saved_resource"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "saved_resource_resourceId_idx" ON "saved_resource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_resource_userId_resourceId_key" ON "saved_resource"("userId", "resourceId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_selectedLevelId_fkey" FOREIGN KEY ("selectedLevelId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_selectedLevelId_fkey" FOREIGN KEY ("selectedLevelId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_resendOfRecipientId_fkey" FOREIGN KEY ("resendOfRecipientId") REFERENCES "notification_recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refund" ADD CONSTRAINT "payment_refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refund" ADD CONSTRAINT "payment_refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_uploadIntentId_fkey" FOREIGN KEY ("uploadIntentId") REFERENCES "upload_intent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revision" ADD CONSTRAINT "content_revision_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_audit_log" ADD CONSTRAINT "content_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_image" ADD CONSTRAINT "content_image_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_content_image" ADD CONSTRAINT "resource_content_image_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_content_image" ADD CONSTRAINT "resource_content_image_contentImageId_fkey" FOREIGN KEY ("contentImageId") REFERENCES "content_image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_video" ADD CONSTRAINT "youtube_video_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_resource" ADD CONSTRAINT "pdf_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_resource" ADD CONSTRAINT "file_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_resource" ADD CONSTRAINT "link_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_resource" ADD CONSTRAINT "game_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_resource" ADD CONSTRAINT "image_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_resource" ADD CONSTRAINT "audio_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_resource" ADD CONSTRAINT "saved_resource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_resource" ADD CONSTRAINT "saved_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CustomCheckConstraint
-- Prisma Schema Language does not currently represent this cross-field invariant.
ALTER TABLE "notification_recipient"
ADD CONSTRAINT "notification_recipient_subscription_snapshot_check" CHECK (
  ("subscriptionId" IS NULL AND "periodEndSnapshot" IS NULL AND "levelNumberSnapshot" IS NULL AND "initialReminderKey" IS NULL)
  OR ("subscriptionId" IS NOT NULL AND "periodEndSnapshot" IS NOT NULL AND "levelNumberSnapshot" IS NOT NULL)
);

-- CustomCheckConstraint
-- A revision must target exactly one entity and its kind must match that target.
ALTER TABLE "content_revision"
ADD CONSTRAINT "content_revision_exactly_one_target" CHECK (
  ("kind" = 'MODULE' AND "moduleId" IS NOT NULL AND "resourceId" IS NULL)
  OR ("kind" = 'RESOURCE' AND "resourceId" IS NOT NULL AND "moduleId" IS NULL)
);

-- CustomPartialUniqueIndex
-- Only one open payment may exist for the same user, level, and provider mode.
CREATE UNIQUE INDEX "payment_one_open_per_user_level_mode_key"
ON "payment" ("userId", "levelId", "providerMode")
WHERE "status" IN ('INITIALIZING', 'PROCESSING', 'REQUIRES_REVIEW');

-- CustomPartialUniqueIndex
-- Legacy refund rows retain their original concurrency safeguards.
CREATE UNIQUE INDEX "payment_refund_one_open_per_payment_key"
ON "payment_refund" ("paymentId")
WHERE "status" IN ('REQUESTED', 'PENDING', 'REQUIRES_REVIEW');

-- CustomPartialUniqueIndex
CREATE UNIQUE INDEX "payment_refund_one_succeeded_per_payment_key"
ON "payment_refund" ("paymentId")
WHERE "status" = 'SUCCEEDED';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'COLLABORATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('LESSON', 'QUIZ', 'YOUTUBE', 'PDF', 'FILE', 'LINK', 'GAME', 'DIDACTIC', 'IMAGE', 'AUDIO');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "birthDate" TIMESTAMP(3),
    "ageDeclared" INTEGER,
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyAcceptedAt" TIMESTAMP(3),
    "ageVerifiedAt" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "currentLevelId" TEXT,
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
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level" (
    "id" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "description" TEXT,
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
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "estimatedMinutes" INTEGER,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "didactic_resource" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "objective" TEXT,

    CONSTRAINT "didactic_resource_pkey" PRIMARY KEY ("id")
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
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- CreateIndex
CREATE INDEX "subscription_userId_idx" ON "subscription"("userId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "level_levelNumber_key" ON "level"("levelNumber");

-- CreateIndex
CREATE INDEX "subject_levelId_idx" ON "subject"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_levelId_name_key" ON "subject"("levelId", "name");

-- CreateIndex
CREATE INDEX "module_subjectId_idx" ON "module"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "module_subjectId_title_key" ON "module"("subjectId", "title");

-- CreateIndex
CREATE INDEX "resource_moduleId_idx" ON "resource"("moduleId");

-- CreateIndex
CREATE INDEX "resource_type_idx" ON "resource"("type");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_resourceId_key" ON "lesson"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_resourceId_key" ON "quiz"("resourceId");

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
CREATE UNIQUE INDEX "didactic_resource_resourceId_key" ON "didactic_resource"("resourceId");

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
CREATE INDEX "resource_progress_resourceId_idx" ON "resource_progress"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_progress_userId_resourceId_key" ON "resource_progress"("userId", "resourceId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_currentLevelId_fkey" FOREIGN KEY ("currentLevelId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "didactic_resource" ADD CONSTRAINT "didactic_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_resource" ADD CONSTRAINT "image_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_resource" ADD CONSTRAINT "audio_resource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

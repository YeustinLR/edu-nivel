CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

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

CREATE INDEX "quiz_attempt_userId_quizId_startedAt_idx"
ON "quiz_attempt"("userId", "quizId", "startedAt");

CREATE INDEX "quiz_attempt_quizId_status_idx"
ON "quiz_attempt"("quizId", "status");

ALTER TABLE "quiz_attempt"
ADD CONSTRAINT "quiz_attempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quiz_attempt"
ADD CONSTRAINT "quiz_attempt_quizId_fkey"
FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "learner_activity_day" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learner_activity_day_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "learner_activity_day_userId_activityDate_key"
ON "learner_activity_day"("userId", "activityDate");

CREATE INDEX "learner_activity_day_userId_activityDate_idx"
ON "learner_activity_day"("userId", "activityDate" DESC);

ALTER TABLE "learner_activity_day"
ADD CONSTRAINT "learner_activity_day_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

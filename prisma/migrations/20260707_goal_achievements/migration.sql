-- CreateTable
CREATE TABLE "GoalAchievement" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "activityId" TEXT,
    "source" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "periodKey" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalAchievement_goalId_achievedAt_idx" ON "GoalAchievement"("goalId", "achievedAt");

-- CreateIndex
CREATE INDEX "GoalAchievement_activityId_idx" ON "GoalAchievement"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalAchievement_goalId_periodKey_key" ON "GoalAchievement"("goalId", "periodKey");

-- AddForeignKey
ALTER TABLE "GoalAchievement" ADD CONSTRAINT "GoalAchievement_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalAchievement" ADD CONSTRAINT "GoalAchievement_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

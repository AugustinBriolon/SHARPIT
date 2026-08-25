-- DropIndex
DROP INDEX "BodyCompositionMeasurement_source_externalId_key";

-- DropIndex
DROP INDEX "DailyBriefing_date_key";

-- DropIndex
DROP INDEX "DailyHealth_date_key";

-- DropIndex
DROP INDEX "DailyNutrition_date_provider_key";

-- DropIndex
DROP INDEX "DailyNutrition_externalId_key";

-- DropIndex
DROP INDEX "PerformanceRecord_category_rank_key";

-- DropIndex
DROP INDEX "StravaAccount_athleteId_key";

-- DropIndex
DROP INDEX "WeeklyReview_weekStart_key";

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable: clerkUserId cannot backfill via a default, so it lands
-- nullable, gets its one-row backfill, then is tightened.
ALTER TABLE "AthleteProfile" ADD COLUMN     "clerkUserId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

UPDATE "AthleteProfile" SET "clerkUserId" = 'user_3Fno6j0ptwuOzA8x0ei9ylIIDnR' WHERE "id" = 'default';

ALTER TABLE "AthleteProfile" ALTER COLUMN "clerkUserId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AthleteTravelContext" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "BrickAnalysis" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Condition" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "ConditionObservation" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "DailyBriefing" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "DailyHealth" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "DailyNutrition" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable: metadata-only rename, preserves the existing row and the PK.
ALTER TABLE "GarminAccount" RENAME COLUMN "id" TO "athleteId";

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable: metadata-only rename, preserves the existing row and the PK.
ALTER TABLE "GoogleAccount" RENAME COLUMN "id" TO "athleteId";

-- AlterTable
ALTER TABLE "HikeTrip" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable: metadata-only rename, preserves the existing row and the PK.
ALTER TABLE "MyFitnessPalAccount" RENAME COLUMN "id" TO "athleteId";

-- AlterTable
ALTER TABLE "PerformanceRecord" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "PhysicalNote" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "PlannedSession" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable: metadata-only rename, preserves the existing row and the PK.
ALTER TABLE "RenphoAccount" RENAME COLUMN "id" TO "athleteId";

-- AlterTable: StravaAccount carries two different "athleteId" concepts —
-- free the name before claiming it for the tenant PK.
ALTER TABLE "StravaAccount" RENAME COLUMN "athleteId" TO "stravaAthleteId";
ALTER TABLE "StravaAccount" RENAME COLUMN "id" TO "athleteId";

-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "WeeklyReview" ADD COLUMN     "athleteId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable: metadata-only rename, preserves the existing row and the PK.
ALTER TABLE "WithingsAccount" RENAME COLUMN "id" TO "athleteId";

-- CreateIndex
CREATE INDEX "Activity_athleteId_idx" ON "Activity"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_clerkUserId_key" ON "AthleteProfile"("clerkUserId");

-- CreateIndex
CREATE INDEX "AthleteTravelContext_athleteId_idx" ON "AthleteTravelContext"("athleteId");

-- CreateIndex
CREATE INDEX "BodyCompositionMeasurement_athleteId_idx" ON "BodyCompositionMeasurement"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "BodyCompositionMeasurement_athleteId_source_externalId_key" ON "BodyCompositionMeasurement"("athleteId", "source", "externalId");

-- CreateIndex
CREATE INDEX "BrickAnalysis_athleteId_idx" ON "BrickAnalysis"("athleteId");

-- CreateIndex
CREATE INDEX "Condition_athleteId_idx" ON "Condition"("athleteId");

-- CreateIndex
CREATE INDEX "ConditionObservation_athleteId_idx" ON "ConditionObservation"("athleteId");

-- CreateIndex
CREATE INDEX "Conversation_athleteId_idx" ON "Conversation"("athleteId");

-- CreateIndex
CREATE INDEX "DailyBriefing_athleteId_idx" ON "DailyBriefing"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBriefing_athleteId_date_key" ON "DailyBriefing"("athleteId", "date");

-- CreateIndex
CREATE INDEX "DailyHealth_athleteId_idx" ON "DailyHealth"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealth_athleteId_date_key" ON "DailyHealth"("athleteId", "date");

-- CreateIndex
CREATE INDEX "DailyNutrition_athleteId_idx" ON "DailyNutrition"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNutrition_athleteId_date_provider_key" ON "DailyNutrition"("athleteId", "date", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNutrition_athleteId_externalId_key" ON "DailyNutrition"("athleteId", "externalId");

-- CreateIndex
CREATE INDEX "Goal_athleteId_idx" ON "Goal"("athleteId");

-- CreateIndex
CREATE INDEX "HikeTrip_athleteId_idx" ON "HikeTrip"("athleteId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_athleteId_idx" ON "PerformanceRecord"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceRecord_athleteId_category_rank_key" ON "PerformanceRecord"("athleteId", "category", "rank");

-- CreateIndex
CREATE INDEX "PhysicalNote_athleteId_idx" ON "PhysicalNote"("athleteId");

-- CreateIndex
CREATE INDEX "PlannedSession_athleteId_idx" ON "PlannedSession"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaAccount_stravaAthleteId_key" ON "StravaAccount"("stravaAthleteId");

-- CreateIndex
CREATE INDEX "TrainingPlan_athleteId_idx" ON "TrainingPlan"("athleteId");

-- CreateIndex
CREATE INDEX "WeeklyReview_athleteId_idx" ON "WeeklyReview"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_athleteId_weekStart_key" ON "WeeklyReview"("athleteId", "weekStart");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarminAccount" ADD CONSTRAINT "GarminAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaAccount" ADD CONSTRAINT "StravaAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenphoAccount" ADD CONSTRAINT "RenphoAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithingsAccount" ADD CONSTRAINT "WithingsAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MyFitnessPalAccount" ADD CONSTRAINT "MyFitnessPalAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNutrition" ADD CONSTRAINT "DailyNutrition_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeTrip" ADD CONSTRAINT "HikeTrip_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHealth" ADD CONSTRAINT "DailyHealth_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyCompositionMeasurement" ADD CONSTRAINT "BodyCompositionMeasurement_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalNote" ADD CONSTRAINT "PhysicalNote_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyBriefing" ADD CONSTRAINT "DailyBriefing_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSet" ADD CONSTRAINT "FeatureSet_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalTwin" ADD CONSTRAINT "DigitalTwin_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentalObservationRecord" ADD CONSTRAINT "EnvironmentalObservationRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRecord" ADD CONSTRAINT "DecisionRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingDecision" ADD CONSTRAINT "CoachingDecision_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSnapshotRecord" ADD CONSTRAINT "AthleteSnapshotRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteTravelContext" ADD CONSTRAINT "AthleteTravelContext_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrickAnalysis" ADD CONSTRAINT "BrickAnalysis_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


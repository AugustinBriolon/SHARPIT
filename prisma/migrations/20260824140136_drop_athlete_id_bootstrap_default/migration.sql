-- ADR-025 Phase 1 exit criterion: every write path now supplies athleteId
-- explicitly (0 tsc errors across the sweep). Drop the bootstrap default so
-- Prisma's generated *UncheckedCreateInput types require it again, and so a
-- forgotten athleteId fails loudly instead of silently landing on the
-- original tenant.
ALTER TABLE "Activity" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "AthleteThresholdSnapshot" ALTER COLUMN "profileId" DROP DEFAULT;
ALTER TABLE "DailyNutrition" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "HikeTrip" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "DailyHealth" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "BodyCompositionMeasurement" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "Goal" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "TrainingPlan" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "PhysicalNote" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "Condition" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "ConditionObservation" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "DailyBriefing" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "WeeklyReview" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "PerformanceRecord" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "Observation" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "FeatureSet" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "CoachingDecision" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "PlannedSession" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "AthleteTravelContext" ALTER COLUMN "athleteId" DROP DEFAULT;
ALTER TABLE "BrickAnalysis" ALTER COLUMN "athleteId" DROP DEFAULT;

-- Persist last Garmin strength workout push on planned sessions (dedupe + UI status).
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "garminWorkoutId" TEXT;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "garminWorkoutScheduledDate" TEXT;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "garminWorkoutPushedAt" TIMESTAMP(3);

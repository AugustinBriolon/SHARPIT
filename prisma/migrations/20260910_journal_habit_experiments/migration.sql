-- 7-day journal habit experiments (ADR-032): one factor, one intent, one window.
-- Progress, review date and verdict are derived at read time; only intent is stored.
CREATE TYPE "JournalHabitExperimentIntent" AS ENUM ('REMOVE', 'ADD');

CREATE TABLE "JournalHabitExperiment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "factorId" TEXT NOT NULL,
    "intent" "JournalHabitExperimentIntent" NOT NULL,
    "startDayId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalHabitExperiment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JournalHabitExperiment_athleteId_startDayId_idx" ON "JournalHabitExperiment"("athleteId", "startDayId");

ALTER TABLE "JournalHabitExperiment" ADD CONSTRAINT "JournalHabitExperiment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

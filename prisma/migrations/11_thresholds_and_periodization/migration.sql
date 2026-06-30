-- CreateEnum
CREATE TYPE "PlanPhase" AS ENUM ('BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE');

-- CreateEnum
CREATE TYPE "TrainingPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AthleteThresholdSnapshot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL DEFAULT 'default',
    "source" TEXT NOT NULL,
    "ftpW" INTEGER,
    "lthr" INTEGER,
    "runThresholdPaceSecPerKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteThresholdSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "goalId" TEXT,
    "raceDate" DATE NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "TrainingPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "baselineCtl" INTEGER,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "phase" "PlanPhase" NOT NULL,
    "targetLoad" INTEGER NOT NULL,
    "targetHours" DOUBLE PRECISION,
    "focus" TEXT,
    "isDeload" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteThresholdSnapshot_profileId_idx" ON "AthleteThresholdSnapshot"("profileId");

-- CreateIndex
CREATE INDEX "AthleteThresholdSnapshot_createdAt_idx" ON "AthleteThresholdSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "TrainingPlan_status_idx" ON "TrainingPlan"("status");

-- CreateIndex
CREATE INDEX "TrainingPlan_raceDate_idx" ON "TrainingPlan"("raceDate");

-- CreateIndex
CREATE INDEX "PlanWeek_planId_idx" ON "PlanWeek"("planId");

-- CreateIndex
CREATE INDEX "PlanWeek_weekStart_idx" ON "PlanWeek"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PlanWeek_planId_weekIndex_key" ON "PlanWeek"("planId", "weekIndex");

-- AddForeignKey
ALTER TABLE "AthleteThresholdSnapshot" ADD CONSTRAINT "AthleteThresholdSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanWeek" ADD CONSTRAINT "PlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

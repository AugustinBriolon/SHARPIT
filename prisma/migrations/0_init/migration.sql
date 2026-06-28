-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RUN', 'BIKE', 'SWIM', 'STRENGTH');

-- CreateEnum
CREATE TYPE "GoalHorizon" AS ENUM ('LONG_TERM', 'MEDIUM_TERM', 'SHORT_TERM', 'WEEKLY');

-- CreateEnum
CREATE TYPE "GoalKind" AS ENUM ('RACE', 'METRIC');

-- CreateEnum
CREATE TYPE "SessionIntensity" AS ENUM ('RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "duration" INTEGER,
    "rpe" INTEGER,
    "feeling" TEXT,
    "notes" TEXT,
    "weather" TEXT,
    "load" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "stravaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityStream" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "polyline" TEXT,
    "data" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarminAccount" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "displayName" TEXT,
    "fullName" TEXT,
    "oauth1Token" JSONB NOT NULL,
    "oauth2Token" JSONB NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarminAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaAccount" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "athleteId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "paceSecPerKm" DOUBLE PRECISION,
    "avgHr" INTEGER,
    "avgPower" DOUBLE PRECISION,
    "cadence" INTEGER,
    "shoes" TEXT,

    CONSTRAINT "RunMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "ftpPercent" DOUBLE PRECISION,
    "normalizedPower" DOUBLE PRECISION,
    "intensityFactor" DOUBLE PRECISION,
    "tss" DOUBLE PRECISION,
    "avgCadence" INTEGER,
    "avgPower" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "calories" INTEGER,
    "bikeName" TEXT,

    CONSTRAINT "BikeMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "sets" INTEGER,
    "cssSecPer100m" DOUBLE PRECISION,
    "avgPaceSecPer100m" DOUBLE PRECISION,
    "swolf" DOUBLE PRECISION,
    "drills" TEXT,

    CONSTRAINT "SwimMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthSet" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "rpe" INTEGER,
    "restSec" INTEGER,
    "videoUrl" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StrengthSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyHealth" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sleepMinutes" INTEGER,
    "hrv" INTEGER,
    "restingHr" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "calories" INTEGER,
    "recoveryScore" INTEGER,
    "stress" INTEGER,
    "mood" TEXT,
    "readinessLevel" TEXT,
    "readinessFeedback" TEXT,
    "readinessFactors" JSONB,
    "hrvStatus" TEXT,
    "hrvBaselineLow" INTEGER,
    "hrvBaselineHigh" INTEGER,
    "bodyBattery" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "GoalKind" NOT NULL DEFAULT 'METRIC',
    "horizon" "GoalHorizon",
    "metricKey" TEXT,
    "startValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT,
    "lowerIsBetter" BOOLEAN NOT NULL DEFAULT false,
    "targetDate" TIMESTAMP(3),
    "location" TEXT,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedSession" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "durationMin" INTEGER,
    "load" DOUBLE PRECISION,
    "intensity" "SessionIntensity",
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_stravaId_key" ON "Activity"("stravaId");

-- CreateIndex
CREATE INDEX "Activity_date_idx" ON "Activity"("date");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityStream_activityId_key" ON "ActivityStream"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaAccount_athleteId_key" ON "StravaAccount"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "RunMetrics_activityId_key" ON "RunMetrics"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "BikeMetrics_activityId_key" ON "BikeMetrics"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "SwimMetrics_activityId_key" ON "SwimMetrics"("activityId");

-- CreateIndex
CREATE INDEX "StrengthSet_activityId_idx" ON "StrengthSet"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealth_date_key" ON "DailyHealth"("date");

-- CreateIndex
CREATE INDEX "Goal_kind_idx" ON "Goal"("kind");

-- CreateIndex
CREATE INDEX "Goal_targetDate_idx" ON "Goal"("targetDate");

-- CreateIndex
CREATE INDEX "PlannedSession_date_idx" ON "PlannedSession"("date");

-- AddForeignKey
ALTER TABLE "ActivityStream" ADD CONSTRAINT "ActivityStream_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunMetrics" ADD CONSTRAINT "RunMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeMetrics" ADD CONSTRAINT "BikeMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimMetrics" ADD CONSTRAINT "SwimMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSet" ADD CONSTRAINT "StrengthSet_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;


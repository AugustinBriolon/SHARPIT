-- CreateEnum
CREATE TYPE "PhysicalCategory" AS ENUM ('PAIN', 'INJURY', 'MOBILITY', 'POSTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "BodySide" AS ENUM ('LEFT', 'RIGHT', 'BILATERAL', 'NA');

-- CreateEnum
CREATE TYPE "PhysicalStatus" AS ENUM ('ACTIVE', 'MONITORING', 'RESOLVED');

-- AlterTable
ALTER TABLE "PlannedSession" ADD COLUMN     "activityId" TEXT,
ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "analyzedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "ftpW" INTEGER,
    "maxHr" INTEGER,
    "lthr" INTEGER,
    "runThresholdPaceSecPerKm" DOUBLE PRECISION,
    "vo2maxRunning" INTEGER,
    "vo2maxCycling" INTEGER,
    "thresholdsSyncedAt" TIMESTAMP(3),
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalNote" (
    "id" TEXT NOT NULL,
    "category" "PhysicalCategory" NOT NULL DEFAULT 'PAIN',
    "status" "PhysicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "bodyPart" TEXT,
    "side" "BodySide" NOT NULL DEFAULT 'NA',
    "severity" INTEGER,
    "description" TEXT,
    "affectsTraining" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalCheckin" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhysicalNote_status_idx" ON "PhysicalNote"("status");

-- CreateIndex
CREATE INDEX "PhysicalCheckin_noteId_idx" ON "PhysicalCheckin"("noteId");

-- CreateIndex
CREATE INDEX "PhysicalCheckin_date_idx" ON "PhysicalCheckin"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedSession_activityId_key" ON "PlannedSession"("activityId");

-- AddForeignKey
ALTER TABLE "PhysicalCheckin" ADD CONSTRAINT "PhysicalCheckin_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "PhysicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

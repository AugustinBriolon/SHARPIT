-- CreateTable
CREATE TABLE IF NOT EXISTS "AthleteDayJournal" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "factors" JSONB NOT NULL DEFAULT '{}',
    "moodLabel" TEXT,
    "hydrationMl" INTEGER,
    "caffeineMg" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteDayJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AthleteActivityStatus" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "retentionKind" TEXT NOT NULL DEFAULT 'until_modified',
    "untilDate" DATE,
    "travelId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteActivityStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AthleteActivityStatusHistory" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retentionKind" TEXT NOT NULL,
    "untilDate" DATE,
    "travelId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteActivityStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AthleteDayJournal_athleteId_trainingDayId_idx" ON "AthleteDayJournal"("athleteId", "trainingDayId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AthleteDayJournal_athleteId_trainingDayId_key" ON "AthleteDayJournal"("athleteId", "trainingDayId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AthleteActivityStatus_athleteId_key" ON "AthleteActivityStatus"("athleteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AthleteActivityStatusHistory_athleteId_startedAt_idx" ON "AthleteActivityStatusHistory"("athleteId", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AthleteActivityStatusHistory_athleteId_endedAt_idx" ON "AthleteActivityStatusHistory"("athleteId", "endedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AthleteDayJournal" ADD CONSTRAINT "AthleteDayJournal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AthleteActivityStatus" ADD CONSTRAINT "AthleteActivityStatus_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AthleteActivityStatusHistory" ADD CONSTRAINT "AthleteActivityStatusHistory_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

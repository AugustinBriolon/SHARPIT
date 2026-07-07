-- Athlete Snapshot — canonical product state per training day
CREATE TABLE "AthleteSnapshotRecord" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteSnapshotRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteSnapshotRecord_athleteId_trainingDayId_key" ON "AthleteSnapshotRecord"("athleteId", "trainingDayId");
CREATE INDEX "AthleteSnapshotRecord_snapshotId_idx" ON "AthleteSnapshotRecord"("snapshotId");
CREATE INDEX "AthleteSnapshotRecord_generatedAt_idx" ON "AthleteSnapshotRecord"("generatedAt");

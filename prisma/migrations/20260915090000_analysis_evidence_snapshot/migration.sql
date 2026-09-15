-- Science Sport reliability V0: athlete-isolated A/B analysis evidence.
-- Retention: last 5 OR 14 days (APPLICATION layer). Privacy TBD for TTL lock.
-- Cascade delete with AthleteProfile; purge hooks on soft-delete / health consent withdraw.

CREATE TABLE "AnalysisEvidenceSnapshot" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "inputs" JSONB NOT NULL,
    "verdict" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisEvidenceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalysisEvidenceSnapshot_athleteId_createdAt_idx" ON "AnalysisEvidenceSnapshot"("athleteId", "createdAt");

CREATE INDEX "AnalysisEvidenceSnapshot_athleteId_trainingDayId_createdAt_idx" ON "AnalysisEvidenceSnapshot"("athleteId", "trainingDayId", "createdAt");

ALTER TABLE "AnalysisEvidenceSnapshot" ADD CONSTRAINT "AnalysisEvidenceSnapshot_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

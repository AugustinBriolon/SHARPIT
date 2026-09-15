-- Science Sport reliability V0: athlete-isolated A/B analysis evidence.
-- Retention LOCKED (Privacy + Secu): last 5 OR 14 days (APPLICATION layer).
-- Cascade delete with AthleteProfile; purge hooks on soft-delete / health or AI consent withdraw.
-- Idempotent: safe to re-run after a half-applied / pre-created table (Postgres 42P07).

CREATE TABLE IF NOT EXISTS "AnalysisEvidenceSnapshot" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "inputs" JSONB NOT NULL,
    "verdict" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisEvidenceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalysisEvidenceSnapshot_athleteId_createdAt_idx"
  ON "AnalysisEvidenceSnapshot"("athleteId", "createdAt");

CREATE INDEX IF NOT EXISTS "AnalysisEvidenceSnapshot_athleteId_trainingDayId_createdAt_idx"
  ON "AnalysisEvidenceSnapshot"("athleteId", "trainingDayId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AnalysisEvidenceSnapshot_athleteId_fkey'
  ) THEN
    ALTER TABLE "AnalysisEvidenceSnapshot"
      ADD CONSTRAINT "AnalysisEvidenceSnapshot_athleteId_fkey"
      FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Persist matched exercise-catalog id for strength visuals (Phase 1).
ALTER TABLE "StrengthSet" ADD COLUMN IF NOT EXISTS "exerciseCatalogId" TEXT;
CREATE INDEX IF NOT EXISTS "StrengthSet_exerciseCatalogId_idx" ON "StrengthSet"("exerciseCatalogId");

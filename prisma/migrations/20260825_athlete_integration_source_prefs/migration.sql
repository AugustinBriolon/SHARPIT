-- Per data-class primary/enabled provider preferences (ADR-027).
ALTER TABLE "AthleteProfile" ADD COLUMN "integrationSourcePrefs" JSONB;

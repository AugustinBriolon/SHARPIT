-- Which parts of SharpIt the athlete uses; null means every feature on.
ALTER TABLE "AthleteProfile" ADD COLUMN "featurePrefs" JSONB;

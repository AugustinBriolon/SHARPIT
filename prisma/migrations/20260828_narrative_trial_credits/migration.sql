-- Free-tier athletes get a small number of on-demand session-analysis
-- credits so they can try the Pro-gated narrative before paying — this
-- column tracks how many they've already spent.
ALTER TABLE "AthleteProfile" ADD COLUMN "freeNarrativeCreditsUsed" INTEGER NOT NULL DEFAULT 0;

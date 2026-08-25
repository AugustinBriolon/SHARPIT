-- First-login onboarding gate. Existing athletes skip the wizard; only profiles
-- created after this migration (onboardingCompletedAt IS NULL) are redirected.
ALTER TABLE "AthleteProfile" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

UPDATE "AthleteProfile" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP
WHERE "onboardingCompletedAt" IS NULL;

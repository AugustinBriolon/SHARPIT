-- Privacy mini V0: legal + processing consents + soft-delete on AthleteProfile.
-- Soft-deleted profiles are excluded from app/cron; hard purge after 30 days
-- via /api/cron/privacy-purge (see vercel.json).

ALTER TABLE "AthleteProfile" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "AthleteProfile" ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "AthleteProfile" ADD COLUMN "privacyVersion" TEXT;
ALTER TABLE "AthleteProfile" ADD COLUMN "healthDataConsentAt" TIMESTAMP(3);
ALTER TABLE "AthleteProfile" ADD COLUMN "aiProcessingConsentAt" TIMESTAMP(3);
ALTER TABLE "AthleteProfile" ADD COLUMN "unofficialProvidersAckAt" TIMESTAMP(3);
ALTER TABLE "AthleteProfile" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "AthleteProfile_deletedAt_idx" ON "AthleteProfile"("deletedAt");

-- Objectifs sommeil personnalisés (coach sommeil + profil athlète)
ALTER TABLE "AthleteProfile" ADD COLUMN "sleepTargetMinutes" INTEGER;
ALTER TABLE "AthleteProfile" ADD COLUMN "sleepBedtimeTargetMin" INTEGER;

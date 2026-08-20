-- Longueur de bassin habituelle de l'athlète. Garmin exige une longueur de
-- bassin pour rendre une séance de natation en piscine sur la montre ; sans
-- elle, le workout ne peut pas être construit.
ALTER TABLE "AthleteProfile" ADD COLUMN "defaultPoolLengthM" INTEGER;

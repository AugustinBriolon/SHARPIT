-- Reading density chosen by the athlete: 'essential' hides technical metrics,
-- 'expert' unlocks them. A fresh profile opens on the accessible reading.
ALTER TABLE "AthleteProfile" ADD COLUMN "displayMode" TEXT NOT NULL DEFAULT 'essential';

-- Profiles that already exist were built against the expert reading — the app
-- showed every technical metric before this column existed. Backfilling them to
-- 'expert' keeps what they see unchanged; only new profiles start essential.
UPDATE "AthleteProfile" SET "displayMode" = 'expert';

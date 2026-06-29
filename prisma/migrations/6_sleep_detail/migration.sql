-- Sommeil détaillé (phases, score, horaires) sur DailyHealth
ALTER TABLE "DailyHealth"
  ADD COLUMN "sleepScore" INTEGER,
  ADD COLUMN "sleepDeepMin" INTEGER,
  ADD COLUMN "sleepLightMin" INTEGER,
  ADD COLUMN "sleepRemMin" INTEGER,
  ADD COLUMN "sleepAwakeMin" INTEGER,
  ADD COLUMN "sleepBedtimeMin" INTEGER,
  ADD COLUMN "sleepWakeMin" INTEGER,
  ADD COLUMN "sleepRespiration" DOUBLE PRECISION,
  ADD COLUMN "sleepAvgStress" INTEGER,
  ADD COLUMN "sleepScoreFeedback" TEXT;

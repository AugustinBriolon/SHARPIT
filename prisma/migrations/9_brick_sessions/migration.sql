-- Séances brick / multisport : regroupement des jambes d'un même enchaînement
-- (ex. vélo → course). Chaque jambe reste une séance autonome (un sport, une
-- activité liée, une analyse) mais partage un brickGroupId commun.
ALTER TABLE "PlannedSession" ADD COLUMN "brickGroupId" TEXT;
ALTER TABLE "PlannedSession" ADD COLUMN "brickOrder" INTEGER;

CREATE INDEX "PlannedSession_brickGroupId_idx" ON "PlannedSession"("brickGroupId");

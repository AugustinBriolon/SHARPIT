-- Détails de course pour les objectifs (kind = RACE) : priorité A/B/C,
-- format/distance et objectif de performance visé. Tous optionnels → les
-- objectifs existants restent valides.
CREATE TYPE "GoalPriority" AS ENUM ('A', 'B', 'C');

ALTER TABLE "Goal" ADD COLUMN "priority" "GoalPriority";
ALTER TABLE "Goal" ADD COLUMN "raceFormat" TEXT;
ALTER TABLE "Goal" ADD COLUMN "targetPerformance" TEXT;

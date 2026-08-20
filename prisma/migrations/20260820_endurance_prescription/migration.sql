-- Prescription endurance structurée (RUN / BIKE / SWIM) : steps, groupes de
-- répétition et cibles. Les cibles sont stockées en relatif (% des seuils
-- athlète) et résolues en valeurs absolues au moment de l'envoi à la montre.
ALTER TABLE "PlannedSession" ADD COLUMN "endurancePrescription" JSONB;

-- Seuils athlète utilisés lors du dernier envoi Garmin. Sert à détecter qu'une
-- séance déjà envoyée est périmée parce que les seuils ont bougé depuis :
-- le changement vient de l'athlète, pas de la séance, donc l'invalidation
-- existante (sur modification de la séance) ne peut pas le voir.
ALTER TABLE "PlannedSession" ADD COLUMN "garminWorkoutThresholds" JSONB;

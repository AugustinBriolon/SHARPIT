-- Hot path: freshness + snapshot findFirst by athleteId + trainingDayId + type
CREATE INDEX IF NOT EXISTS "Observation_athleteId_trainingDayId_type_idx"
  ON "Observation" ("athleteId", "trainingDayId", "type");

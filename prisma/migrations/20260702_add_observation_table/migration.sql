-- AddObservationTable
-- Observation Engine: primary store for all normalized+validated observations.
-- See: src/core/observation/types.ts

CREATE TABLE "Observation" (
    "id"            TEXT NOT NULL,
    "athleteId"     TEXT NOT NULL DEFAULT 'default',
    "type"          TEXT NOT NULL,
    "source"        TEXT NOT NULL,
    "timestamp"     TIMESTAMP(3) NOT NULL,
    "receivedAt"    TIMESTAMP(3) NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "quality"       TEXT NOT NULL,
    "qualityFlags"  JSONB NOT NULL DEFAULT '[]',
    "normalizedAt"  TIMESTAMP(3) NOT NULL,
    "externalId"    TEXT,
    "data"          JSONB NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Observation_athleteId_type_idx"        ON "Observation"("athleteId", "type");
CREATE INDEX "Observation_athleteId_trainingDayId_idx" ON "Observation"("athleteId", "trainingDayId");
CREATE INDEX "Observation_type_externalId_idx"       ON "Observation"("type", "externalId");
CREATE INDEX "Observation_timestamp_idx"             ON "Observation"("timestamp");

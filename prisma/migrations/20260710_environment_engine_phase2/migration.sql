-- Environmental Context Engine — Phase 2: observations + Twin columns

CREATE TABLE "EnvironmentalObservationRecord" (
    "id" TEXT NOT NULL,
    "recordVersion" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL,
    "trainingDayId" TEXT,
    "temporalScope" TEXT NOT NULL,
    "intervalStart" TIMESTAMP(3),
    "intervalEnd" TIMESTAMP(3),
    "exposure" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "providerId" TEXT,
    "externalId" TEXT,
    "providerSnapshot" JSONB NOT NULL,
    "fieldQuality" JSONB NOT NULL,
    "aggregateQuality" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "supersededBy" TEXT,

    CONSTRAINT "EnvironmentalObservationRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnvironmentalObservationRecord_athleteId_trainingDayId_idx"
    ON "EnvironmentalObservationRecord"("athleteId", "trainingDayId");
CREATE INDEX "EnvironmentalObservationRecord_athleteId_observedAt_idx"
    ON "EnvironmentalObservationRecord"("athleteId", "observedAt");
CREATE INDEX "EnvironmentalObservationRecord_supersededBy_idx"
    ON "EnvironmentalObservationRecord"("supersededBy");

ALTER TABLE "DigitalTwin" ADD COLUMN "environmentalStressState" JSONB;
ALTER TABLE "DigitalTwin" ADD COLUMN "environmentalImpactState" JSONB;
ALTER TABLE "DigitalTwin" ADD COLUMN "environmentalStateMeta" JSONB;

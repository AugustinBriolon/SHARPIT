-- Physical Health Engine — Phase 1 domain model
-- Adds Condition, Episode, Observation, FunctionalCapacity, ConditionKnowledge.
-- Legacy PhysicalNote / PhysicalCheckin tables are preserved.

CREATE TYPE "ConditionScope" AS ENUM ('LOCALIZED', 'SYSTEMIC');

CREATE TYPE "ConditionType" AS ENUM (
  'PAIN',
  'INJURY',
  'DISCOMFORT',
  'MOBILITY_LIMITATION',
  'POSTURE_ISSUE',
  'MUSCULAR_TIGHTNESS',
  'JOINT_STIFFNESS',
  'INSTABILITY',
  'RECURRING_PHYSICAL',
  'OTHER'
);

CREATE TYPE "ConditionStatus" AS ENUM (
  'NEW',
  'ACTIVE',
  'IMPROVING',
  'STABLE',
  'WORSENING',
  'RESOLVED',
  'RECURRENT'
);

CREATE TYPE "EpisodeStatus" AS ENUM (
  'ACTIVE',
  'IMPROVING',
  'STABLE',
  'WORSENING',
  'RESOLVED'
);

CREATE TYPE "ObservationContext" AS ENUM (
  'BEFORE_SESSION',
  'DURING_SESSION',
  'AFTER_SESSION',
  'MORNING_CHECKIN',
  'EVENING_CHECKIN',
  'MANUAL',
  'COACH_CONVERSATION',
  'INTEGRATION',
  'LEGACY_MIGRATION'
);

CREATE TYPE "ObservationSource" AS ENUM (
  'ATHLETE',
  'COACH_AI',
  'SYSTEM_MIGRATION',
  'INTEGRATION'
);

CREATE TYPE "FunctionalImpact" AS ENUM (
  'NONE',
  'MILD',
  'MODERATE',
  'LIMITING',
  'STOPPED'
);

CREATE TYPE "TrainingCapacityLevel" AS ENUM (
  'FULL',
  'REDUCED',
  'LIMITED',
  'UNABLE'
);

CREATE TYPE "KnowledgeHypothesisType" AS ENUM (
  'TRIGGER',
  'RECOVERY_DURATION',
  'RECURRENCE_PATTERN',
  'OTHER'
);

CREATE TYPE "KnowledgeConfidenceLevel" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

CREATE TABLE "Condition" (
  "id" TEXT NOT NULL,
  "scope" "ConditionScope" NOT NULL,
  "type" "ConditionType" NOT NULL,
  "bodyRegion" TEXT NOT NULL,
  "side" "BodySide" NOT NULL DEFAULT 'NA',
  "label" TEXT NOT NULL,
  "diagnosis" TEXT,
  "status" "ConditionStatus" NOT NULL DEFAULT 'NEW',
  "severity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "affectsTraining" BOOLEAN NOT NULL DEFAULT true,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "lastObservationAt" TIMESTAMP(3),
  "recurrenceCount" INTEGER NOT NULL DEFAULT 0,
  "observationCount" INTEGER NOT NULL DEFAULT 0,
  "estimatedRecoveryDays" INTEGER,
  "primaryTriggerManual" TEXT,
  "legacyPhysicalNoteId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConditionEpisode" (
  "id" TEXT NOT NULL,
  "conditionId" TEXT NOT NULL,
  "episodeNumber" INTEGER NOT NULL,
  "status" "EpisodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "peakSeverity" DOUBLE PRECISION,
  "estimatedRecoveryDays" INTEGER,
  "triggerHypothesis" TEXT,

  CONSTRAINT "ConditionEpisode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConditionObservation" (
  "id" TEXT NOT NULL,
  "conditionId" TEXT,
  "episodeId" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "context" "ObservationContext" NOT NULL,
  "source" "ObservationSource" NOT NULL DEFAULT 'ATHLETE',
  "symptomPresent" BOOLEAN NOT NULL,
  "severityReported" INTEGER,
  "functionalImpact" "FunctionalImpact",
  "bodyRegion" TEXT NOT NULL,
  "side" "BodySide" NOT NULL DEFAULT 'NA',
  "type" "ConditionType" NOT NULL,
  "comment" TEXT,
  "activityId" TEXT,
  "plannedSessionId" TEXT,
  "trainingDayId" TEXT,
  "externalId" TEXT,
  "legacyPhysicalCheckinId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConditionObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FunctionalCapacity" (
  "id" TEXT NOT NULL,
  "conditionId" TEXT NOT NULL,
  "observationId" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "painSeverity" INTEGER,
  "trainingCapacity" "TrainingCapacityLevel" NOT NULL,
  "comment" TEXT,

  CONSTRAINT "FunctionalCapacity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConditionKnowledge" (
  "id" TEXT NOT NULL,
  "conditionId" TEXT NOT NULL,
  "hypothesisType" "KnowledgeHypothesisType" NOT NULL,
  "description" TEXT NOT NULL,
  "confidence" "KnowledgeConfidenceLevel" NOT NULL DEFAULT 'LOW',
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "isInferred" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConditionKnowledge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Condition_legacyPhysicalNoteId_key" ON "Condition"("legacyPhysicalNoteId");
CREATE INDEX "Condition_status_idx" ON "Condition"("status");
CREATE INDEX "Condition_type_idx" ON "Condition"("type");
CREATE INDEX "Condition_bodyRegion_side_idx" ON "Condition"("bodyRegion", "side");

CREATE UNIQUE INDEX "ConditionEpisode_conditionId_episodeNumber_key" ON "ConditionEpisode"("conditionId", "episodeNumber");
CREATE INDEX "ConditionEpisode_conditionId_idx" ON "ConditionEpisode"("conditionId");

CREATE UNIQUE INDEX "ConditionObservation_externalId_key" ON "ConditionObservation"("externalId");
CREATE UNIQUE INDEX "ConditionObservation_legacyPhysicalCheckinId_key" ON "ConditionObservation"("legacyPhysicalCheckinId");
CREATE INDEX "ConditionObservation_conditionId_observedAt_idx" ON "ConditionObservation"("conditionId", "observedAt");
CREATE INDEX "ConditionObservation_activityId_idx" ON "ConditionObservation"("activityId");
CREATE INDEX "ConditionObservation_plannedSessionId_idx" ON "ConditionObservation"("plannedSessionId");
CREATE INDEX "ConditionObservation_observedAt_idx" ON "ConditionObservation"("observedAt");

CREATE INDEX "FunctionalCapacity_conditionId_assessedAt_idx" ON "FunctionalCapacity"("conditionId", "assessedAt");

CREATE INDEX "ConditionKnowledge_conditionId_idx" ON "ConditionKnowledge"("conditionId");

ALTER TABLE "ConditionEpisode" ADD CONSTRAINT "ConditionEpisode_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "ConditionEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "PlannedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FunctionalCapacity" ADD CONSTRAINT "FunctionalCapacity_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FunctionalCapacity" ADD CONSTRAINT "FunctionalCapacity_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "ConditionObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConditionKnowledge" ADD CONSTRAINT "ConditionKnowledge_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

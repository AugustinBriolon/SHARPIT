-- Decision Memory aggregate — see docs/adr/ADR-006-decision-memory-aggregate.md
-- Separate from DecisionRecord (per-engine-run inference audit trail, unchanged).

-- CreateEnum
CREATE TYPE "CoachingDecisionSource" AS ENUM ('PLAN_GENERATOR', 'PLAN_ADAPTER');

-- CreateEnum
CREATE TYPE "CoachingDecisionStatus" AS ENUM ('PRESENTED', 'ACCEPTED', 'MODIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CoachingDecisionActionType" AS ENUM ('ACCEPTED', 'MODIFIED', 'REJECTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "CoachingDecisionActionSource" AS ENUM ('PLAN_REVIEW_UI', 'CALENDAR_EDIT', 'BATCH_EXPIRY');

-- CreateEnum
CREATE TYPE "CoachingOutcomeStatus" AS ENUM ('EVALUATED', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "CoachingDecision" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL DEFAULT 'default',
    "trainingDayId" TEXT NOT NULL,
    "source" "CoachingDecisionSource" NOT NULL,
    "status" "CoachingDecisionStatus" NOT NULL DEFAULT 'PRESENTED',
    "proposal" JSONB NOT NULL,
    "gateResult" JSONB NOT NULL,
    "snapshotContext" JSONB NOT NULL,
    "snapshotIdAtRecommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingDecisionAction" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "actionType" "CoachingDecisionActionType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "CoachingDecisionActionSource" NOT NULL,
    "rationale" TEXT,
    "resultingPlannedSessionId" TEXT,

    CONSTRAINT "CoachingDecisionAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingDecisionOutcome" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcomeStatus" "CoachingOutcomeStatus" NOT NULL,
    "executionMatch" JSONB,
    "subjectiveResponse" JSONB,
    "shortTermRecoveryResponse" JSONB,
    "safetySignal" JSONB,
    "limitations" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CoachingDecisionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachingDecision_athleteId_trainingDayId_idx" ON "CoachingDecision"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "CoachingDecision_status_idx" ON "CoachingDecision"("status");

-- CreateIndex
CREATE INDEX "CoachingDecisionAction_decisionId_idx" ON "CoachingDecisionAction"("decisionId");

-- CreateIndex
CREATE INDEX "CoachingDecisionAction_resultingPlannedSessionId_idx" ON "CoachingDecisionAction"("resultingPlannedSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingDecisionOutcome_decisionId_key" ON "CoachingDecisionOutcome"("decisionId");

-- CreateIndex
CREATE INDEX "CoachingDecisionOutcome_decisionId_idx" ON "CoachingDecisionOutcome"("decisionId");

-- AddForeignKey
ALTER TABLE "CoachingDecisionAction" ADD CONSTRAINT "CoachingDecisionAction_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "CoachingDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingDecisionOutcome" ADD CONSTRAINT "CoachingDecisionOutcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "CoachingDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

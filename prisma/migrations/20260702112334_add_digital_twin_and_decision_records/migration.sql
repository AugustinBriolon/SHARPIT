-- CreateTable
CREATE TABLE "DigitalTwin" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "recoveryState" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalTwin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "signals" JSONB NOT NULL,
    "stateUpdate" JSONB NOT NULL,
    "decision" JSONB NOT NULL,
    "recommendation" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "inputSummary" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalTwin_athleteId_key" ON "DigitalTwin"("athleteId");

-- CreateIndex
CREATE INDEX "DigitalTwin_athleteId_idx" ON "DigitalTwin"("athleteId");

-- CreateIndex
CREATE INDEX "DecisionRecord_athleteId_trainingDayId_idx" ON "DecisionRecord"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "DecisionRecord_athleteId_modelId_idx" ON "DecisionRecord"("athleteId", "modelId");

-- CreateIndex
CREATE INDEX "DecisionRecord_computedAt_idx" ON "DecisionRecord"("computedAt");

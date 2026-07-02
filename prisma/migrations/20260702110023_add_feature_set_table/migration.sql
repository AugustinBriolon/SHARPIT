-- CreateTable
CREATE TABLE "FeatureSet" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL DEFAULT 'default',
    "category" TEXT NOT NULL,
    "trainingDayId" TEXT,
    "sessionObsId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "algorithmId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sourceObsIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "computedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_category_trainingDayId_idx" ON "FeatureSet"("athleteId", "category", "trainingDayId");

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_category_sessionObsId_idx" ON "FeatureSet"("athleteId", "category", "sessionObsId");

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_trainingDayId_idx" ON "FeatureSet"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_status_idx" ON "FeatureSet"("athleteId", "status");

-- CreateIndex
CREATE INDEX "FeatureSet_sessionObsId_idx" ON "FeatureSet"("sessionObsId");

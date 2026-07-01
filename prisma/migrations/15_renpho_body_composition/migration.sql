-- CreateTable
CREATE TABLE "RenphoAccount" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "email" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "displayName" TEXT,
    "renphoUserId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenphoAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyCompositionMeasurement" (
    "id" TEXT NOT NULL,
    "renphoId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "waterPct" DOUBLE PRECISION,
    "musclePct" DOUBLE PRECISION,
    "boneKg" DOUBLE PRECISION,
    "bmr" DOUBLE PRECISION,
    "visceralFat" DOUBLE PRECISION,
    "proteinPct" DOUBLE PRECISION,
    "bodyAge" INTEGER,
    "subcutaneousFatPct" DOUBLE PRECISION,
    "skeletalMusclePct" DOUBLE PRECISION,
    "fatFreeWeightKg" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyCompositionMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BodyCompositionMeasurement_renphoId_key" ON "BodyCompositionMeasurement"("renphoId");

-- CreateIndex
CREATE INDEX "BodyCompositionMeasurement_measuredAt_idx" ON "BodyCompositionMeasurement"("measuredAt");

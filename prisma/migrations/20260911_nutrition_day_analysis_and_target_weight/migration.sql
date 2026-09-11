-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN IF NOT EXISTS "targetWeightKg" DOUBLE PRECISION;

-- CreateEnum
CREATE TYPE "NutritionAnalysisStatus" AS ENUM ('PROVISIONAL', 'FINAL');

-- CreateTable
CREATE TABLE "NutritionDayAnalysis" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "NutritionAnalysisStatus" NOT NULL DEFAULT 'FINAL',
    "inputHash" TEXT,
    "facts" JSONB,
    "analysis" JSONB,
    "model" TEXT,
    "generatedAt" TIMESTAMP(3),
    "attemptHash" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionDayAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionDayAnalysis_athleteId_date_key" ON "NutritionDayAnalysis"("athleteId", "date");

-- AddForeignKey
ALTER TABLE "NutritionDayAnalysis" ADD CONSTRAINT "NutritionDayAnalysis_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

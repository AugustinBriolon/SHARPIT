-- In-app food log: Open Food Facts cache + own foods, logged entries, intake targets (ADR-061).
-- CreateEnum
CREATE TYPE "FoodProductSource" AS ENUM ('OFF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FoodMeal" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS');

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "nutritionTargetCarbsG" DOUBLE PRECISION,
ADD COLUMN     "nutritionTargetFatG" DOUBLE PRECISION,
ADD COLUMN     "nutritionTargetKcal" INTEGER,
ADD COLUMN     "nutritionTargetProteinG" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "FoodProduct" (
    "id" TEXT NOT NULL,
    "source" "FoodProductSource" NOT NULL,
    "barcode" TEXT,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "kcalPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "fiberPer100g" DOUBLE PRECISION,
    "sugarPer100g" DOUBLE PRECISION,
    "servingGrams" DOUBLE PRECISION,
    "servingLabel" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLogEntry" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "meal" "FoodMeal" NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodProduct_barcode_key" ON "FoodProduct"("barcode");

-- CreateIndex
CREATE INDEX "FoodProduct_ownerId_idx" ON "FoodProduct"("ownerId");

-- CreateIndex
CREATE INDEX "FoodLogEntry_athleteId_date_idx" ON "FoodLogEntry"("athleteId", "date");

-- AddForeignKey
ALTER TABLE "FoodProduct" ADD CONSTRAINT "FoodProduct_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogEntry" ADD CONSTRAINT "FoodLogEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogEntry" ADD CONSTRAINT "FoodLogEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FoodProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;


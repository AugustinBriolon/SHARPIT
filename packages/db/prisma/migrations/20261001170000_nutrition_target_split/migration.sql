-- CreateEnum
CREATE TYPE "NutritionTargetMode" AS ENUM ('GRAMS', 'PERCENT');

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "nutritionTargetCarbsPct" INTEGER,
ADD COLUMN     "nutritionTargetFatPct" INTEGER,
ADD COLUMN     "nutritionTargetMode" "NutritionTargetMode" NOT NULL DEFAULT 'GRAMS',
ADD COLUMN     "nutritionTargetProteinPct" INTEGER;

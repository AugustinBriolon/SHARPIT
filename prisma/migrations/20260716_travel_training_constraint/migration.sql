-- CreateEnum
CREATE TYPE "TravelTrainingConstraint" AS ENUM ('FULL', 'REDUCED', 'MOBILITY_ONLY', 'NONE');

-- AlterTable
ALTER TABLE "AthleteTravelContext" ADD COLUMN "trainingConstraint" "TravelTrainingConstraint" NOT NULL DEFAULT 'FULL';

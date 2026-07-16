-- CreateEnum
CREATE TYPE "TravelDiscipline" AS ENUM ('RUN', 'BIKE', 'SWIM', 'STRENGTH', 'MOBILITY');

-- AlterTable
ALTER TABLE "AthleteTravelContext" ADD COLUMN "allowedDisciplines" "TravelDiscipline"[] DEFAULT ARRAY[]::"TravelDiscipline"[];

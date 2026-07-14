-- CreateEnum
CREATE TYPE "CoachMemorySource" AS ENUM ('USER', 'COACH');

-- AlterTable
ALTER TABLE "AthleteTravelContext" ADD COLUMN "source" "CoachMemorySource" NOT NULL DEFAULT 'USER';

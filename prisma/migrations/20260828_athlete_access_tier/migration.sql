-- CreateEnum
CREATE TYPE "AccessTier" AS ENUM ('FREE', 'EXPERT');

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN "tier" "AccessTier" NOT NULL DEFAULT 'FREE';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AthleteSex" AS ENUM ('female', 'male', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN IF NOT EXISTS "sex" "AthleteSex";
ALTER TABLE "AthleteProfile" ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB;

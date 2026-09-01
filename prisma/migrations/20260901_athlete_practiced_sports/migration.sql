-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN IF NOT EXISTS "practicedSports" JSONB;

-- Existing athletes: leave NULL. Read-path normalize defaults to all core sports
-- (run, bike, swim, triathlon) so they are never blocked — see design note 2026-09-01.

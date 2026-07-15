-- Track the athlete-centric daily phase (MORNING|BEFORE_SESSION|SESSION_COMPLETED|
-- RECOVERY_WINDOW|END_OF_DAY) at briefing generation time, so freshness can detect
-- a phase change (e.g. morning → afternoon) as staleness, not just new inference
-- or a new session.
ALTER TABLE "DailyBriefing" ADD COLUMN "phaseAtGeneration" TEXT;

-- Intelligent Planned Sessions — contextual fields
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "exposureSetting" TEXT;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "locationLabel" TEXT;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "locationType" TEXT;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "environmentContext" JSONB;
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "environmentContextAt" TIMESTAMP(3);

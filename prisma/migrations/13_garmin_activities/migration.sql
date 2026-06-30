-- Sync activités Garmin + déduplication avec Strava
ALTER TABLE "Activity" ADD COLUMN "garminId" TEXT;
CREATE UNIQUE INDEX "Activity_garminId_key" ON "Activity"("garminId");

ALTER TABLE "GarminAccount" ADD COLUMN "lastActivitySyncAt" TIMESTAMP(3);

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'HIKE';

-- CreateTable
CREATE TABLE "HikeMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "elevationLossM" DOUBLE PRECISION,
    "avgHr" INTEGER,
    "calories" INTEGER,
    "avgSpeedMps" DOUBLE PRECISION,

    CONSTRAINT "HikeMetrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HikeMetrics_activityId_key" ON "HikeMetrics"("activityId");

ALTER TABLE "HikeMetrics" ADD CONSTRAINT "HikeMetrics_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

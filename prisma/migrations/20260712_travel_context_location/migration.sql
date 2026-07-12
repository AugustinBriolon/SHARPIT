-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "observedLocationLabel" TEXT,
ADD COLUMN "observedLocationLat" DOUBLE PRECISION,
ADD COLUMN "observedLocationLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN "homeLocationLabel" TEXT,
ADD COLUMN "homeLocationLat" DOUBLE PRECISION,
ADD COLUMN "homeLocationLng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AthleteTravelContext" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "locationLabel" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION NOT NULL,
    "locationLng" DOUBLE PRECISION NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteTravelContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteTravelContext_startDate_endDate_idx" ON "AthleteTravelContext"("startDate", "endDate");

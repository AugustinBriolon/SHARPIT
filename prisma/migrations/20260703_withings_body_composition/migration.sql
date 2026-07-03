-- CreateEnum
CREATE TYPE "BodyCompositionSource" AS ENUM ('RENPHO', 'WITHINGS');

-- AlterTable
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "source" "BodyCompositionSource";
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "externalId" TEXT;

UPDATE "BodyCompositionMeasurement"
SET "source" = 'RENPHO', "externalId" = "renphoId";

ALTER TABLE "BodyCompositionMeasurement" ALTER COLUMN "source" SET NOT NULL;
ALTER TABLE "BodyCompositionMeasurement" ALTER COLUMN "externalId" SET NOT NULL;

DROP INDEX "BodyCompositionMeasurement_renphoId_key";
ALTER TABLE "BodyCompositionMeasurement" DROP COLUMN "renphoId";

-- CreateIndex
CREATE UNIQUE INDEX "BodyCompositionMeasurement_source_externalId_key" ON "BodyCompositionMeasurement"("source", "externalId");
CREATE INDEX "BodyCompositionMeasurement_source_measuredAt_idx" ON "BodyCompositionMeasurement"("source", "measuredAt");

-- CreateTable
CREATE TABLE "WithingsAccount" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "withingsUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithingsAccount_pkey" PRIMARY KEY ("id")
);

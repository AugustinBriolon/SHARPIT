-- CreateEnum
CREATE TYPE "AthleteMemoryEntryType" AS ENUM ('TRAVEL', 'CONSTRAINT');

-- AlterTable: add discriminator (existing rows backfill as TRAVEL via default),
-- location becomes optional — CONSTRAINT entries have no place.
ALTER TABLE "AthleteTravelContext" ADD COLUMN "type" "AthleteMemoryEntryType" NOT NULL DEFAULT 'TRAVEL';
ALTER TABLE "AthleteTravelContext" ALTER COLUMN "locationLabel" DROP NOT NULL;
ALTER TABLE "AthleteTravelContext" ALTER COLUMN "locationLat" DROP NOT NULL;
ALTER TABLE "AthleteTravelContext" ALTER COLUMN "locationLng" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AthleteTravelContext_type_idx" ON "AthleteTravelContext" ("type");

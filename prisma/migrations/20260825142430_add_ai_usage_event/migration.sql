-- AlterTable
ALTER TABLE "GarminAccount" ALTER COLUMN "athleteId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GoogleAccount" ALTER COLUMN "athleteId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MyFitnessPalAccount" ALTER COLUMN "athleteId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RenphoAccount" ALTER COLUMN "athleteId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StravaAccount" ALTER COLUMN "athleteId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WithingsAccount" ALTER COLUMN "athleteId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageEvent_athleteId_createdAt_idx" ON "AiUsageEvent"("athleteId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


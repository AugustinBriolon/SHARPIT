-- SharpIt Pro entitlements (ADR-044): AthleteProfile.tier becomes derived from these rows.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SubscriptionSource" AS ENUM ('apple', 'stripe', 'manual');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'grace_period', 'billing_retry', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN IF NOT EXISTS "appAccountToken" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "source" "SubscriptionSource" NOT NULL,
    "productId" TEXT NOT NULL,
    "originalTransactionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "willRenew" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT,
    "appAccountToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_originalTransactionId_key" ON "Subscription"("originalTransactionId");
CREATE INDEX IF NOT EXISTS "Subscription_athleteId_idx" ON "Subscription"("athleteId");
CREATE UNIQUE INDEX IF NOT EXISTS "AthleteProfile_appAccountToken_key" ON "AthleteProfile"("appAccountToken");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: every athlete already Pro by the /admin toggle keeps Pro through a manual
-- entitlement, so the first tier recomputation cannot take it away.
INSERT INTO "Subscription" ("id", "athleteId", "source", "productId", "status", "willRenew", "updatedAt")
SELECT 'manual_' || "id", "id", 'manual', 'manual', 'active', false, CURRENT_TIMESTAMP
FROM "AthleteProfile"
WHERE "tier" = 'PRO'
ON CONFLICT ("id") DO NOTHING;

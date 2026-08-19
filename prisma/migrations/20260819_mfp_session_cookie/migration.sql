-- Replace abused OAuth-shaped MFP credential fields with an encrypted session cookie.
-- Table has 0 rows in every environment (MFP was never successfully connected via
-- the old username + public diary-key flow), so this is a safe destructive rename.
--
-- An email+password credentials-login variant of this migration was tried and
-- reverted before commit: MFP's next-auth credentials endpoint requires solving a
-- reCAPTCHA server-side, which a plain server-to-server fetch cannot satisfy
-- (verified: POST /api/auth/callback/credentials returns error=RecaptchaFailed
-- unconditionally). See ADR-013.
--
-- Production never had a versioned migration creating the MyFitnessPal tables.
-- Create the final schema when absent; otherwise normalize any local-only
-- preexisting table shape to the final cookie-based model.

CREATE TABLE IF NOT EXISTS "MyFitnessPalAccount" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "sessionTokenEnc" TEXT NOT NULL,
  "displayName" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MyFitnessPalAccount_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "MyFitnessPalAccount_userId_key";

ALTER TABLE IF EXISTS "MyFitnessPalAccount"
  DROP COLUMN IF EXISTS "userId",
  DROP COLUMN IF EXISTS "accessToken",
  DROP COLUMN IF EXISTS "refreshToken",
  DROP COLUMN IF EXISTS "expiresAt",
  ADD COLUMN IF NOT EXISTS "sessionTokenEnc" TEXT,
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS "MyFitnessPalAccount"
  ALTER COLUMN "sessionTokenEnc" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "DailyNutrition" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'myfitnesspal',
  "externalId" TEXT,
  "calories" INTEGER NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbohydrates" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "fiber" DOUBLE PRECISION,
  "sugar" DOUBLE PRECISION,
  "water" DOUBLE PRECISION,
  "meals" JSONB NOT NULL DEFAULT '[]',
  "complete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyNutrition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyNutrition_externalId_key"
  ON "DailyNutrition"("externalId");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyNutrition_date_provider_key"
  ON "DailyNutrition"("date", "provider");

CREATE INDEX IF NOT EXISTS "DailyNutrition_date_idx"
  ON "DailyNutrition"("date");

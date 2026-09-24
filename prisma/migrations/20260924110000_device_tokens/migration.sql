-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "bundleId" TEXT NOT NULL DEFAULT 'app.sharpit.ios',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN IF NOT EXISTS "lastMorningPushDate" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX IF NOT EXISTS "DeviceToken_athleteId_idx" ON "DeviceToken"("athleteId");
CREATE INDEX IF NOT EXISTS "DeviceToken_token_idx" ON "DeviceToken"("token");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DeviceToken_athleteId_fkey'
  ) THEN
    ALTER TABLE "DeviceToken"
      ADD CONSTRAINT "DeviceToken_athleteId_fkey"
      FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

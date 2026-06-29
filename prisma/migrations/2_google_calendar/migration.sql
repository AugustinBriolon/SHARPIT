-- AlterTable
ALTER TABLE "PlannedSession" ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "googleEventId" TEXT;

-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "targetCalendarId" TEXT,
    "targetCalendarName" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlannedSession_googleEventId_key" ON "PlannedSession"("googleEventId");

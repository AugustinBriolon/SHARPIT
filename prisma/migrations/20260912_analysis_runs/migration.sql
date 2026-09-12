-- CreateEnum
CREATE TYPE "AnalysisKind" AS ENUM ('ACTIVITY_NARRATIVE', 'SESSION_COMPLIANCE', 'BRICK', 'WEEKLY_REVIEW');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('RUNNING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "kind" "AnalysisKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisRun_athleteId_kind_targetId_key" ON "AnalysisRun"("athleteId", "kind", "targetId");

-- CreateIndex
CREATE INDEX "AnalysisRun_athleteId_finishedAt_idx" ON "AnalysisRun"("athleteId", "finishedAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_athleteId_status_idx" ON "AnalysisRun"("athleteId", "status");

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

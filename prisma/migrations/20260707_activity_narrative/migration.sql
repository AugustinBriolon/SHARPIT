-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "narrativeAnalysis" JSONB;
ALTER TABLE "Activity" ADD COLUMN "narrativeAnalyzedAt" TIMESTAMP(3);

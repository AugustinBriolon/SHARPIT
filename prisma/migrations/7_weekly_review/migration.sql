-- Rétro hebdomadaire générée par le coach IA
CREATE TABLE "WeeklyReview" (
  "id" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "content" TEXT NOT NULL,
  "stats" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyReview_weekStart_key" ON "WeeklyReview"("weekStart");
CREATE INDEX "WeeklyReview_weekStart_idx" ON "WeeklyReview"("weekStart");

-- Records de performance pré-calculés (top 5 par catégorie)
CREATE TABLE "PerformanceRecord" (
  "id" TEXT NOT NULL,
  "group" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "displayValue" TEXT NOT NULL,
  "sublabel" TEXT,
  "activityId" TEXT,
  "activityDate" TIMESTAMP(3) NOT NULL,
  "activityTitle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PerformanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PerformanceRecord_category_rank_key" ON "PerformanceRecord"("category", "rank");
CREATE INDEX "PerformanceRecord_group_idx" ON "PerformanceRecord"("group");

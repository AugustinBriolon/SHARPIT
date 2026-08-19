-- Add MyFitnessPal nutrient goals and exercise calories to the daily nutrition row.
--
-- All five columns are nullable: goals only exist for days MFP has a nutrient-goal
-- bundle for, and exercise calories only for days with exercise entries. Existing
-- rows keep NULL and the presentation layer already treats a null goal as "no goal
-- set" rather than as zero.
--
-- Written with IF NOT EXISTS to match this project's convention, so it applies
-- cleanly whether or not an environment already received these columns through a
-- `prisma db push`.

ALTER TABLE IF EXISTS "DailyNutrition"
  ADD COLUMN IF NOT EXISTS "goalCalories" INTEGER,
  ADD COLUMN IF NOT EXISTS "goalProtein" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "goalCarbohydrates" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "goalFat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "exerciseCalories" INTEGER;

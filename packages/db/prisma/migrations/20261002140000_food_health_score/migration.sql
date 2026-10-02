-- Sharpit food health score: salt / saturated fat for partial custom scores, and a cached
-- health assessment JSON (score, additives, nutrient flags).
ALTER TABLE "FoodProduct" ADD COLUMN "saltPer100g" DOUBLE PRECISION;
ALTER TABLE "FoodProduct" ADD COLUMN "saturatedFatPer100g" DOUBLE PRECISION;
ALTER TABLE "FoodProduct" ADD COLUMN "health" JSONB;

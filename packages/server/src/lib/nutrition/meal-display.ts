import type {
  NutritionFoodEntry,
  NutritionMealSummary,
} from '@sharpit/app/presentation/nutrition-view-model';
import { FOOD_MEALS } from '@sharpit/app/lib/nutrition/food-log/food-log-math';
import { FOOD_MEAL_LABELS } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

const MEAL_ORDER = FOOD_MEALS.map((meal) => meal.toLowerCase());

const MEAL_LABELS: Record<string, string> = Object.fromEntries(
  FOOD_MEALS.map((meal) => [meal.toLowerCase(), FOOD_MEAL_LABELS[meal]]),
);

export function formatMealLabel(rawName: string): string {
  const key = rawName.trim().toLowerCase();
  return MEAL_LABELS[key] ?? rawName.charAt(0).toUpperCase() + rawName.slice(1);
}

export function mealSortIndex(rawName: string): number {
  const key = rawName.trim().toLowerCase();
  const index = MEAL_ORDER.indexOf(key);
  return index === -1 ? MEAL_ORDER.length : index;
}

type StoredMeal = Partial<NutritionMealSummary> & {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entries?: NutritionFoodEntry[];
};

/** `DailyNutrition.meals` JSON → labelled meals in breakfast → snacks order. */
export function normalizeStoredMeals(raw: unknown): NutritionMealSummary[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return (raw as StoredMeal[])
    .map((meal) => ({
      name: meal.name,
      label: formatMealLabel(meal.name),
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      entries: meal.entries ?? [],
    }))
    .sort((a, b) => mealSortIndex(a.name) - mealSortIndex(b.name));
}

import type {
  NutritionFoodEntry,
  NutritionMealSummary,
} from '@/core/presentation/nutrition-view-model';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snacks: 'Collations',
};

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'];

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

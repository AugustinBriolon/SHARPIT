export type NutritionMacroProgressLine = {
  consumed: number;
  goal: number | null;
  remaining: number | null;
  pct: number | null;
  unit: 'kcal' | 'g';
};

export type NutritionGoalsProgress = {
  calories: NutritionMacroProgressLine;
  protein: NutritionMacroProgressLine;
  carbohydrates: NutritionMacroProgressLine;
  fat: NutritionMacroProgressLine;
  exerciseCalories: number;
  calorieBudget: number;
};

export type NutritionFoodEntry = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
};

export type NutritionMealSummary = {
  name: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entries: NutritionFoodEntry[];
};

export type NutritionFuelDensity = {
  proteinGPerKg: number;
  carbohydratesGPerKg: number;
  referenceWeightKg: number;
};

export type NutritionDaySummary = {
  date: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  complete: boolean;
  meals: NutritionMealSummary[];
  goalsProgress: NutritionGoalsProgress | null;
  /** Per-kilogram macro density when a recent body weight is available. */
  fuelDensity: NutritionFuelDensity | null;
};

export type NutritionViewModel = {
  connected: boolean;
  selectedDay: NutritionDaySummary | null;
  /** Alias for Today card — always the live calendar day. */
  today: NutritionDaySummary | null;
  history: NutritionDaySummary[];
  averages: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  } | null;
  emptyState?: {
    title: string;
    description: string;
  } | null;
};

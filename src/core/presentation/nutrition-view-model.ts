export type NutritionMealSummary = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionDaySummary = {
  date: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  meals: NutritionMealSummary[];
};

export type NutritionViewModel = {
  connected: boolean;
  today: NutritionDaySummary | null;
  history: NutritionDaySummary[];
  averages: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  } | null;
};

import { format, parseISO, subDays } from 'date-fns';
import type {
  NutritionCoachReadingView,
  NutritionDaySummary,
  NutritionViewModel,
} from '@sharpit/app/presentation/nutrition-view-model';

/** Days the history strip covers, ending on the selected day (the web page's window). */
export const V1_NUTRITION_HISTORY_DAYS = 7;

type V1Macro = {
  consumed: number;
  goal: number | null;
  remaining: number | null;
  pct: number | null;
};

export type V1NutritionDay = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  /** The athlete closed the day in their food log. */
  complete: boolean;
  goals: {
    calories: V1Macro;
    protein: V1Macro;
    carbohydrates: V1Macro;
    fat: V1Macro;
    exerciseCalories: number;
    calorieBudget: number;
  } | null;
  fuelDensity: {
    proteinGPerKg: number;
    carbohydratesGPerKg: number;
    referenceWeightKg: number;
  } | null;
  meals: Array<{
    name: string;
    label: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    entries: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>;
  }>;
};

export type V1NutritionResponse = {
  apiVersion: 1;
  trainingDayId: string;
  /** A food log is connected (MyFitnessPal today). */
  connected: boolean;
  empty: { title: string; message: string | null } | null;
  day: V1NutritionDay | null;
  coachReading: NutritionCoachReadingView | null;
  /** Diet declared in the journal, as labels. */
  diet: string[];
  /** Oldest first, one entry per day of the window ending on `trainingDayId`. */
  history: Array<{ date: string; calories: number | null; goalCalories: number | null }>;
};

function macro(line: V1Macro): V1Macro {
  const { consumed, goal, remaining, pct } = line;
  return { consumed, goal, remaining, pct };
}

function projectDay(day: NutritionDaySummary): V1NutritionDay {
  const goals = day.goalsProgress;
  return {
    calories: day.calories,
    protein: day.protein,
    carbohydrates: day.carbohydrates,
    fat: day.fat,
    fiber: day.fiber,
    sugar: day.sugar,
    complete: day.complete,
    goals: goals
      ? {
          calories: macro(goals.calories),
          protein: macro(goals.protein),
          carbohydrates: macro(goals.carbohydrates),
          fat: macro(goals.fat),
          exerciseCalories: goals.exerciseCalories,
          calorieBudget: goals.calorieBudget,
        }
      : null,
    fuelDensity: day.fuelDensity,
    meals: day.meals.map((meal) => ({
      name: meal.name,
      label: meal.label,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      entries: meal.entries.map(({ name, calories, protein, carbs, fat }) => ({
        name,
        calories,
        protein,
        carbs,
        fat,
      })),
    })),
  };
}

function projectHistory(
  history: NutritionDaySummary[],
  trainingDayId: string,
): V1NutritionResponse['history'] {
  const byDate = new Map(history.map((day) => [day.date, day]));
  const end = parseISO(trainingDayId);
  return Array.from({ length: V1_NUTRITION_HISTORY_DAYS }, (_, i) => {
    const date = format(subDays(end, V1_NUTRITION_HISTORY_DAYS - 1 - i), 'yyyy-MM-dd');
    const day = byDate.get(date);
    return {
      date,
      calories: day && day.calories > 0 ? day.calories : null,
      goalCalories: day?.goalsProgress?.calories.goal ?? null,
    };
  });
}

/** Canonical Nutrition payload for native clients — a projection, no new domain logic. */
export function projectV1Nutrition(
  viewModel: NutritionViewModel,
  trainingDayId: string,
): V1NutritionResponse {
  const empty = viewModel.emptyState
    ? { title: viewModel.emptyState.title, message: viewModel.emptyState.description || null }
    : null;
  return {
    apiVersion: 1,
    trainingDayId,
    connected: viewModel.connected,
    empty: viewModel.selectedDay ? null : empty,
    day: viewModel.selectedDay ? projectDay(viewModel.selectedDay) : null,
    coachReading: viewModel.coachReading,
    diet: viewModel.diet.labels,
    history: projectHistory(viewModel.history, trainingDayId),
  };
}

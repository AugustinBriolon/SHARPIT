import { format, parseISO, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getLiveNutrientGoals, getMfpAccount } from '@/lib/integrations/myfitnesspal-sync';
import { buildGoalsProgress } from '@/lib/nutrition/goals-progress';
import { formatMealLabel, mealSortIndex } from '@/lib/nutrition/meal-display';
import type {
  NutritionDaySummary,
  NutritionFoodEntry,
  NutritionGoalsProgress,
  NutritionMealSummary,
  NutritionViewModel,
} from '@/core/presentation/nutrition-view-model';

type StoredMeal = Partial<NutritionMealSummary> & {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entries?: NutritionFoodEntry[];
};

type NutritionRow = {
  date: Date;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  complete: boolean;
  meals: unknown;
  goalCalories: number | null;
  goalProtein: number | null;
  goalCarbohydrates: number | null;
  goalFat: number | null;
  exerciseCalories: number | null;
};

function normalizeMeals(raw: unknown): NutritionMealSummary[] {
  if (!Array.isArray(raw)) return [];

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

function goalsFromRow(row: NutritionRow): NutritionGoalsProgress | null {
  return buildGoalsProgress({
    consumedCalories: row.calories,
    consumedProtein: row.protein,
    consumedCarbohydrates: row.carbohydrates,
    consumedFat: row.fat,
    goalCalories: row.goalCalories,
    goalProtein: row.goalProtein,
    goalCarbohydrates: row.goalCarbohydrates,
    goalFat: row.goalFat,
    exerciseCalories: row.exerciseCalories,
  });
}

function mapRow(r: NutritionRow): NutritionDaySummary {
  return {
    date: format(r.date, 'yyyy-MM-dd'),
    calories: r.calories,
    protein: r.protein,
    carbohydrates: r.carbohydrates,
    fat: r.fat,
    fiber: r.fiber,
    sugar: r.sugar,
    complete: r.complete,
    meals: normalizeMeals(r.meals),
    goalsProgress: goalsFromRow(r),
  };
}

async function resolveGoalsProgress(
  row: NutritionRow,
  fetchLive: boolean,
): Promise<NutritionGoalsProgress | null> {
  const cached = goalsFromRow(row);
  if (cached || !fetchLive) return cached;

  const live = await getLiveNutrientGoals(format(row.date, 'yyyy-MM-dd'));
  if (!live) return null;

  return buildGoalsProgress({
    consumedCalories: row.calories,
    consumedProtein: row.protein,
    consumedCarbohydrates: row.carbohydrates,
    consumedFat: row.fat,
    goalCalories: live.calories,
    goalProtein: live.protein,
    goalCarbohydrates: live.carbohydrates,
    goalFat: live.fat,
    exerciseCalories: row.exerciseCalories,
  });
}

async function enrichSelectedDay(
  day: NutritionDaySummary,
  row: NutritionRow | undefined,
  fetchLiveGoals: boolean,
): Promise<NutritionDaySummary> {
  if (!row) return { ...day, goalsProgress: null };
  const goalsProgress = await resolveGoalsProgress(row, fetchLiveGoals);
  return { ...day, goalsProgress };
}

export async function buildNutritionViewModel(trainingDayId?: string): Promise<NutritionViewModel> {
  const account = await getMfpAccount().catch(() => null);
  const connected = Boolean(account);

  if (!connected) {
    return {
      connected: false,
      selectedDay: null,
      today: null,
      history: [],
      averages: null,
      emptyState: {
        title: 'Nutrition indisponible',
        description: 'Connecte MyFitnessPal dans les réglages pour suivre tes apports.',
      },
    };
  }

  const referenceDate = trainingDayId ? parseISO(trainingDayId) : new Date();
  const selectedDayId = format(referenceDate, 'yyyy-MM-dd');
  const todayId = format(new Date(), 'yyyy-MM-dd');
  const from = subDays(referenceDate, 6);

  const rows = (await prisma.dailyNutrition.findMany({
    where: {
      date: { gte: new Date(`${format(from, 'yyyy-MM-dd')}T00:00:00Z`) },
    },
    orderBy: { date: 'desc' },
  })) as NutritionRow[];

  const history: NutritionDaySummary[] = rows.map(mapRow);
  const selectedRow = rows.find((d) => format(d.date, 'yyyy-MM-dd') === selectedDayId);
  const selectedDayBase = history.find((d) => d.date === selectedDayId) ?? null;
  const selectedDay = selectedDayBase
    ? await enrichSelectedDay(selectedDayBase, selectedRow, selectedRow?.goalCalories == null)
    : null;

  const todayRow = rows.find((d) => format(d.date, 'yyyy-MM-dd') === todayId);
  const todayBase = history.find((d) => d.date === todayId) ?? null;
  const today = todayBase
    ? await enrichSelectedDay(todayBase, todayRow, todayRow?.goalCalories == null)
    : null;

  const averages =
    history.length > 0
      ? {
          calories: Math.round(history.reduce((s, d) => s + d.calories, 0) / history.length),
          protein:
            Math.round((history.reduce((s, d) => s + d.protein, 0) / history.length) * 10) / 10,
          carbohydrates:
            Math.round((history.reduce((s, d) => s + d.carbohydrates, 0) / history.length) * 10) /
            10,
          fat: Math.round((history.reduce((s, d) => s + d.fat, 0) / history.length) * 10) / 10,
        }
      : null;

  const emptyState =
    selectedDay == null
      ? {
          title: 'Aucune donnée ce jour-là',
          description:
            selectedDayId === todayId
              ? 'Synchronise MyFitnessPal ou enregistre tes repas pour voir tes apports.'
              : 'Aucun journal alimentaire synchronisé pour cette date.',
        }
      : null;

  return { connected, selectedDay, today, history, averages, emptyState };
}

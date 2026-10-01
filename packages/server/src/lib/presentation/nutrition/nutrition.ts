import { format, parseISO, subDays } from 'date-fns';
import { isSet } from '@sharpit/shared/value';
import type { FuelFeatureSet } from '@sharpit/core/features/types';
import type {
  NutritionDaySummary,
  NutritionGoalsProgress,
  NutritionFuelDensity,
  NutritionViewModel,
} from '@sharpit/app/presentation/nutrition-view-model';
import { featureEngine } from '@sharpit/server/lib/engines/feature-engine';
import {
  getLiveNutrientGoals,
  getMfpAccount,
} from '@sharpit/server/lib/integrations/myfitnesspal/myfitnesspal-sync';
import {
  getLatestBodyWeightKg,
  macroGPerKg,
} from '@sharpit/server/lib/nutrition/body-weight-for-fuel';
import { buildGoalsProgress } from '@sharpit/app/lib/nutrition/goals-progress';
import { fuelFeatureSetToDensity } from '@sharpit/app/lib/nutrition/fuel-density-display';
import { normalizeStoredMeals } from '@sharpit/server/lib/nutrition/meal-display';
import { loadDeclaredDiet } from '@sharpit/server/lib/nutrition/analysis/nutrition-analysis-inputs';
import { prisma } from '@sharpit/db/client';
import { dedupeNutritionRowsByDay } from '@sharpit/app/lib/nutrition/food-log/nutrition-source';

type NutritionRow = {
  date: Date;
  provider: string;
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
    meals: normalizeStoredMeals(r.meals),
    goalsProgress: goalsFromRow(r),
    fuelDensity: null,
  };
}

async function fallbackFuelDensity(
  athleteId: string,
  trainingDayId: string,
  row: NutritionRow,
): Promise<NutritionFuelDensity | null> {
  const meals = normalizeStoredMeals(row.meals);
  const entryCount = meals.reduce((sum, meal) => sum + meal.entries.length, 0);
  if (entryCount === 0 || row.protein <= 0) {
    return null;
  }

  const referenceWeightKg = await getLatestBodyWeightKg(athleteId, trainingDayId);
  const proteinGPerKg = macroGPerKg(row.protein, referenceWeightKg);
  const carbohydratesGPerKg = macroGPerKg(row.carbohydrates, referenceWeightKg);
  if (!isSet(referenceWeightKg) || !isSet(proteinGPerKg) || !isSet(carbohydratesGPerKg)) {
    return null;
  }

  return { proteinGPerKg, carbohydratesGPerKg, referenceWeightKg };
}

async function loadFuelDensity(
  athleteId: string,
  trainingDayId: string,
  row?: NutritionRow,
): Promise<NutritionFuelDensity | null> {
  try {
    const dayFeatures = await featureEngine.computeDayFeatures(athleteId, trainingDayId);
    if (dayFeatures.fuel !== 'PENDING') {
      const fromEngine = fuelFeatureSetToDensity(dayFeatures.fuel as FuelFeatureSet);
      if (fromEngine) {
        return fromEngine;
      }
    }
  } catch (error) {
    console.error('[nutrition] fuel density lookup failed:', error);
  }

  if (!row) {
    return null;
  }
  return fallbackFuelDensity(athleteId, trainingDayId, row);
}

async function resolveGoalsProgress(
  athleteId: string,
  row: NutritionRow,
  fetchLive: boolean,
): Promise<NutritionGoalsProgress | null> {
  const cached = goalsFromRow(row);
  if (cached || !fetchLive) {
    return cached;
  }

  const live = await getLiveNutrientGoals(athleteId, format(row.date, 'yyyy-MM-dd'));
  if (!live) {
    return null;
  }

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
  athleteId: string,
  day: NutritionDaySummary,
  row: NutritionRow | undefined,
  fetchLiveGoals: boolean,
): Promise<NutritionDaySummary> {
  if (!row) {
    return { ...day, goalsProgress: null, fuelDensity: null };
  }
  const [goalsProgress, fuelDensity] = await Promise.all([
    resolveGoalsProgress(athleteId, row, fetchLiveGoals),
    loadFuelDensity(athleteId, day.date, row),
  ]);
  return { ...day, goalsProgress, fuelDensity };
}

function buildNutritionEmptyState(
  selectedDay: NutritionDaySummary | null,
  selectedDayId: string,
  todayId: string,
) {
  if (isSet(selectedDay)) {
    return null;
  }
  return {
    title: 'Aucune donnée ce jour-là',
    description:
      selectedDayId === todayId
        ? 'Ajoute ton premier repas : scanne un code-barres ou cherche un aliment.'
        : 'Aucun repas enregistré pour cette date.',
  };
}

async function enrichDayIfPresent(
  athleteId: string,
  day: NutritionDaySummary | null | undefined,
  row: NutritionRow | undefined,
): Promise<NutritionDaySummary | null> {
  if (!day) {
    return null;
  }
  return enrichSelectedDay(athleteId, day, row, !isSet(row?.goalCalories));
}

async function buildConnectedNutritionViewModel(
  athleteId: string,
  trainingDayId?: string,
): Promise<NutritionViewModel> {
  const referenceDate = trainingDayId ? parseISO(trainingDayId) : new Date();
  const selectedDayId = format(referenceDate, 'yyyy-MM-dd');
  const todayId = format(new Date(), 'yyyy-MM-dd');
  const from = subDays(referenceDate, 6);

  const rows = dedupeNutritionRowsByDay(
    (await prisma.dailyNutrition.findMany({
      where: {
        athleteId,
        date: { gte: new Date(`${format(from, 'yyyy-MM-dd')}T00:00:00Z`) },
      },
      orderBy: { date: 'desc' },
    })) as NutritionRow[],
  );

  const history: NutritionDaySummary[] = rows.map(mapRow);
  const selectedRow = rows.find((d) => format(d.date, 'yyyy-MM-dd') === selectedDayId);
  const selectedDayBase = history.find((d) => d.date === selectedDayId) ?? null;
  const selectedDay = await enrichDayIfPresent(athleteId, selectedDayBase, selectedRow);

  const todayRow = rows.find((d) => format(d.date, 'yyyy-MM-dd') === todayId);
  const todayBase = history.find((d) => d.date === todayId) ?? null;
  const today = await enrichDayIfPresent(athleteId, todayBase, todayRow);

  const emptyState = buildNutritionEmptyState(selectedDay, selectedDayId, todayId);
  const diet = await loadDeclaredDiet(athleteId);

  return {
    connected: true,
    mfpConnected: false,
    diet,
    coachReading: null,
    selectedDay,
    today,
    history,
    emptyState,
  };
}

/**
 * The Nutrition page. The log lives in SHARPIT (ADR-061), so every athlete has one and the page
 * is never a « connect a provider » wall; MyFitnessPal only adds a sync action when linked.
 */
export async function buildNutritionViewModel(
  athleteId: string,
  trainingDayId?: string,
): Promise<NutritionViewModel> {
  const [account, viewModel] = await Promise.all([
    getMfpAccount(athleteId).catch(() => null),
    buildConnectedNutritionViewModel(athleteId, trainingDayId),
  ]);
  return { ...viewModel, mfpConnected: Boolean(account) };
}

import { format, getISOWeek, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import type {
  NutritionMacroTrendGranularity,
  NutritionMacroTrendPoint,
} from '@/core/presentation/nutrition-macro-trend-view-model';

export type MacroTrendRow = {
  date: Date;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
};

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

function bucketStart(date: Date, granularity: NutritionMacroTrendGranularity): Date {
  switch (granularity) {
    case 'week':
      return startOfWeek(date, { weekStartsOn: 1 });
    case 'month':
      return startOfMonth(date);
    case 'year':
      return startOfYear(date);
  }
}

/** "S32", "août" (or "août 25" once a month label would otherwise repeat across years), "2026". */
function bucketLabel(
  start: Date,
  granularity: NutritionMacroTrendGranularity,
  crossesYearBoundary: boolean,
): string {
  switch (granularity) {
    case 'week':
      return `S${getISOWeek(start)}`;
    case 'month':
      return crossesYearBoundary
        ? format(start, 'MMM yy', { locale: fr })
        : format(start, 'MMM', { locale: fr });
    case 'year':
      return format(start, 'yyyy');
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Share of macro-derived kcal — null once nothing was logged in the bucket. */
function macroPct(grams: number, kcalPerG: number, totalMacroKcal: number): number | null {
  if (totalMacroKcal <= 0) return null;
  return Math.round(((grams * kcalPerG) / totalMacroKcal) * 1000) / 10;
}

/**
 * Buckets daily nutrition rows into week/month/year averages.
 *
 * Pure — no I/O, no Prisma types. Averages are per logged day, not per
 * calendar day in the bucket: a week with two logged days and five gaps
 * reports the two days' average, not a fifth of it.
 */
export function buildNutritionMacroTrend(
  rows: readonly MacroTrendRow[],
  granularity: NutritionMacroTrendGranularity,
): NutritionMacroTrendPoint[] {
  const loggedRows = rows.filter((row) => row.calories > 0);
  if (loggedRows.length === 0) return [];

  const years = new Set(loggedRows.map((row) => bucketStart(row.date, granularity).getFullYear()));
  const crossesYearBoundary = years.size > 1;

  const buckets = new Map<
    string,
    {
      start: Date;
      calories: number;
      protein: number;
      carbohydrates: number;
      fat: number;
      count: number;
    }
  >();

  for (const row of loggedRows) {
    const start = bucketStart(row.date, granularity);
    const key = format(start, 'yyyy-MM-dd');
    const bucket = buckets.get(key) ?? {
      start,
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      count: 0,
    };
    bucket.calories += row.calories;
    bucket.protein += row.protein;
    bucket.carbohydrates += row.carbohydrates;
    bucket.fat += row.fat;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => {
      const proteinAvgG = round1(bucket.protein / bucket.count);
      const carbohydratesAvgG = round1(bucket.carbohydrates / bucket.count);
      const fatAvgG = round1(bucket.fat / bucket.count);
      const totalMacroKcal =
        proteinAvgG * KCAL_PER_G_PROTEIN +
        carbohydratesAvgG * KCAL_PER_G_CARB +
        fatAvgG * KCAL_PER_G_FAT;

      return {
        periodStart: key,
        label: bucketLabel(bucket.start, granularity, crossesYearBoundary),
        daysLogged: bucket.count,
        caloriesAvg: Math.round(bucket.calories / bucket.count),
        proteinAvgG,
        carbohydratesAvgG,
        fatAvgG,
        proteinPct: macroPct(proteinAvgG, KCAL_PER_G_PROTEIN, totalMacroKcal),
        carbohydratesPct: macroPct(carbohydratesAvgG, KCAL_PER_G_CARB, totalMacroKcal),
        fatPct: macroPct(fatAvgG, KCAL_PER_G_FAT, totalMacroKcal),
      } satisfies NutritionMacroTrendPoint;
    });
}

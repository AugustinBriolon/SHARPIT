export const NUTRITION_MACRO_TREND_GRANULARITIES = ['week', 'month', 'year'] as const;

export type NutritionMacroTrendGranularity = (typeof NUTRITION_MACRO_TREND_GRANULARITIES)[number];

/**
 * One bucket of the trend — a week, a month, or a year.
 *
 * Values are per-logged-day averages, not sums: an athlete rarely logs every
 * single day, and a sum would read a sparsely-logged month as starved rather
 * than as sparsely logged. `daysLogged` is carried through so the UI can be
 * honest about a bucket built from one entry.
 */
export type NutritionMacroTrendPoint = {
  /** Bucket start, ISO date (yyyy-MM-dd). */
  periodStart: string;
  /** Short axis label, e.g. "S32", "août", "2026". */
  label: string;
  daysLogged: number;
  caloriesAvg: number;
  proteinAvgG: number;
  carbohydratesAvgG: number;
  fatAvgG: number;
  /** Share of macro-derived kcal (4/4/9 g→kcal) — null with nothing logged. */
  proteinPct: number | null;
  carbohydratesPct: number | null;
  fatPct: number | null;
};

export type NutritionMacroTrendViewModel = {
  connected: boolean;
  granularity: NutritionMacroTrendGranularity;
  points: NutritionMacroTrendPoint[];
  emptyState?: {
    title: string;
    description: string;
  } | null;
};

import type { UseQueryResult } from '@tanstack/react-query';
import type { NutritionViewModel } from '@sharpit/app/presentation/nutrition-view-model';

const ZERO_DAY = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  goalsProgress: null,
} as const;

/**
 * Today's nutrition. Every athlete keeps a log in SharpIt (ADR-061), so there is no « not
 * connected » state: a day with nothing logged keeps its zeros, for a stable layout, and is
 * flagged `empty` so the card invites the first meal.
 */
export function useTodayNutritionDay(query: UseQueryResult<NutritionViewModel>) {
  const today = query.data?.today ?? null;
  const loaded = query.data !== undefined;
  return { day: today ?? (loaded ? ZERO_DAY : null), empty: loaded && today === null };
}

/**
 * ADAPTER — MyFitnessPal diary day → RawNutritionObservation
 *
 * Pure functions. No I/O. No side effects.
 *
 * MyFitnessPal reports one diary per calendar day, already summed per meal and
 * per nutrient. The adapter's only job is to restate that day in the observation
 * vocabulary — it derives nothing.
 */

import type { MfpDayResult } from '@/lib/integrations/myfitnesspal/myfitnesspal';
import type { RawNutritionObservation } from '@/core/observation/types';

/** Midday keeps the anchor clear of every training-day boundary and timezone offset. */
function diaryDayAnchor(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`);
}

function countEntries(day: MfpDayResult): number {
  return day.meals.reduce((total, meal) => total + meal.entries.length, 0);
}

/**
 * Converts a MyFitnessPal diary day to a RawNutritionObservation.
 *
 * Returns null for a day that carries neither food nor goals: MFP answers for
 * every date, so an untouched day comes back as a well-formed empty diary, and
 * recording those as zero-intake observations would tell the athlete's history
 * that they ate nothing on days they simply did not log.
 */
export function mfpDayToNutritionObservation(
  day: MfpDayResult,
  receivedAt: Date,
): RawNutritionObservation | null {
  const entryCount = countEntries(day);
  if (entryCount === 0 && !day.goals) return null;

  return {
    type: 'NUTRITION',
    source: 'MYFITNESSPAL',
    timestamp: diaryDayAnchor(day.date),
    receivedAt,
    energyKcal: Math.round(day.totals.calories),
    proteinG: Math.round(day.totals.protein * 10) / 10,
    carbohydratesG: Math.round(day.totals.carbohydrates * 10) / 10,
    fatG: Math.round(day.totals.fat * 10) / 10,
    fiberG: Math.round(day.totals.fiber * 10) / 10,
    sugarG: Math.round(day.totals.sugar * 10) / 10,
    goalEnergyKcal: day.goals?.calories,
    goalProteinG: day.goals?.protein,
    goalCarbohydratesG: day.goals?.carbohydrates,
    goalFatG: day.goals?.fat,
    exerciseEnergyKcal: day.exerciseCalories,
    diaryComplete: day.complete,
    entryCount,
  };
}

import type { NutritionCoachReadingView } from '@/core/presentation/nutrition-view-model';

/** Poll cadence while the coach reading is being generated in the background. */
export const NUTRITION_READING_POLL_MS = 4_000;

/**
 * The server stops answering "pending" once the claim expires (2 min), so the
 * poll always ends on its own — ready, or unavailable after a failure.
 */
export function nutritionReadingPollInterval(
  reading: NutritionCoachReadingView | null | undefined,
): number | false {
  if (reading?.state === 'pending') {
    return NUTRITION_READING_POLL_MS;
  }
  if (reading?.state === 'ready' && reading.refreshing) {
    return NUTRITION_READING_POLL_MS;
  }
  return false;
}

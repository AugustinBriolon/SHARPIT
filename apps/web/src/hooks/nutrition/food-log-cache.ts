'use client';

import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/client/query/keys';
import { toast } from '@/components/ui/toast';
import type { FoodLogDayPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

/**
 * The food log day cache's optimistic lifecycle (docs/INSTANT_UX_ARCHITECTURE.md §6): patch the
 * day, roll back with a toast on failure, then refresh every reader of the day the server
 * recomputed — the page's view model, the Today card and the date selector dots.
 */

type DayContext = { previous: FoodLogDayPayload | undefined };

export async function patchFoodLogDay(
  queryClient: QueryClient,
  trainingDayId: string,
  patch: (day: FoodLogDayPayload) => FoodLogDayPayload,
): Promise<DayContext> {
  const queryKey = queryKeys.foodLogDay(trainingDayId);
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<FoodLogDayPayload>(queryKey);
  if (previous) {
    queryClient.setQueryData<FoodLogDayPayload>(queryKey, patch(previous));
  }
  return { previous };
}

export function rollbackFoodLogDay(
  queryClient: QueryClient,
  trainingDayId: string,
  context: DayContext | undefined,
  error: unknown,
) {
  if (context?.previous) {
    queryClient.setQueryData(queryKeys.foodLogDay(trainingDayId), context.previous);
  }
  toast.error("L'action a échoué, rien n'a été enregistré.", {
    description: error instanceof Error ? error.message : undefined,
  });
}

/** Every write recomputes the day on the server: its readers refetch in the background. */
export function refreshFoodLogReaders(queryClient: QueryClient, trainingDayId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.foodLogDay(trainingDayId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.presentationNutritionAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.presentationDataDaysDomain('nutrition') }),
  ]);
}

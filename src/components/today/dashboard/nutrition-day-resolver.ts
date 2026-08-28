import type { UseQueryResult } from '@tanstack/react-query';
import { fetchNutritionPresentation } from '@/lib/query/presentation-fetchers';

const ZERO_DAY = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  goalsProgress: null,
} as const;

function isNutritionDisconnected(
  data: Awaited<ReturnType<typeof fetchNutritionPresentation>> | undefined,
  isPending: boolean,
  isError: boolean,
): boolean {
  return !isPending && !isError && data !== undefined && data !== null && !data.connected;
}

function resolveNutritionDay(
  today: Awaited<ReturnType<typeof fetchNutritionPresentation>>['today'] | undefined,
  data: Awaited<ReturnType<typeof fetchNutritionPresentation>> | undefined,
  isPending: boolean,
  isError: boolean,
) {
  if (today) {
    return today;
  }
  if (!isPending && !isError && data?.connected) {
    return ZERO_DAY;
  }
  return null;
}

export function useTodayNutritionDay(
  query: UseQueryResult<Awaited<ReturnType<typeof fetchNutritionPresentation>>>,
) {
  const { data, isPending, isError } = query;
  const disconnected = isNutritionDisconnected(data, isPending, isError);
  const day = resolveNutritionDay(data?.today, data, isPending, isError);
  return { day, disconnected, isPending, isError };
}

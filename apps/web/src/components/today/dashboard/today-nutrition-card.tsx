'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TodayNutritionCardBody,
  TodayNutritionCardSkeleton,
} from '@/components/today/dashboard/today-nutrition-card-body';
import { resolveNutritionLinkTitle } from '@/components/today/dashboard/today-nutrition-card-helpers';
import { useTodayNutritionDay } from '@/components/today/dashboard/nutrition-day-resolver';
import { fetchNutritionPresentation } from '@/client/query/presentation-fetchers';
import { queryKeys } from '@/client/query/keys';
import { trainingDayIdForNow } from '@sharpit/core/training/training-day';

export { TodayNutritionCardSkeleton };

/**
 * Nutrition on Today only when a nutrition source is connected.
 * Disconnected / error → hide (full `/nutrition` page owns the connect gate).
 */
export function TodayNutritionCard() {
  const trainingDayId = trainingDayIdForNow();
  const query = useQuery({
    queryKey: queryKeys.presentationNutrition(trainingDayId),
    queryFn: () => fetchNutritionPresentation(trainingDayId),
    staleTime: 60_000,
  });
  const { day, disconnected } = useTodayNutritionDay(query);

  if (query.isPending) {
    return <TodayNutritionCardSkeleton />;
  }

  if (disconnected || query.isError) {
    return null;
  }

  return (
    <section className="flex h-full min-w-0 flex-col">
      <TodayNutritionCardBody
        day={day}
        disconnected={false}
        isError={false}
        isPending={false}
        linkTitle={resolveNutritionLinkTitle({ disconnected: false, isError: false })}
      />
    </section>
  );
}

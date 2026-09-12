'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TodayNutritionCardBody,
  TodayNutritionCardSkeleton,
} from '@/components/today/dashboard/today-nutrition-card-body';
import { resolveNutritionLinkTitle } from '@/components/today/dashboard/today-nutrition-card-helpers';
import { useTodayNutritionDay } from '@/components/today/dashboard/nutrition-day-resolver';
import { fetchNutritionPresentation } from '@/lib/query/presentation-fetchers';
import { queryKeys } from '@/lib/query/keys';
import { trainingDayIdForNow } from '@/lib/training/periodization/training-day';

export { TodayNutritionCardSkeleton };

export function TodayNutritionCard() {
  const trainingDayId = trainingDayIdForNow();
  const query = useQuery({
    queryKey: queryKeys.presentationNutrition(trainingDayId),
    queryFn: () => fetchNutritionPresentation(trainingDayId),
    staleTime: 60_000,
  });
  const { day, disconnected } = useTodayNutritionDay(query);

  return (
    <section aria-busy={query.isPending || undefined} className="flex h-full min-w-0 flex-col">
      <TodayNutritionCardBody
        day={day}
        disconnected={disconnected}
        isError={query.isError}
        isPending={query.isPending}
        linkTitle={resolveNutritionLinkTitle({ disconnected, isError: query.isError })}
      />
    </section>
  );
}

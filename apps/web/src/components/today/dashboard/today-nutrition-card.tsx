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
 * Today's plate. Every athlete keeps a log in SharpIt (ADR-061): a day with nothing logged
 * keeps its zeros and invites the first meal; an error hides the card (`/nutrition` owns the recovery path).
 */
export function TodayNutritionCard() {
  const trainingDayId = trainingDayIdForNow();
  const query = useQuery({
    queryKey: queryKeys.presentationNutrition(trainingDayId),
    queryFn: () => fetchNutritionPresentation(trainingDayId),
    staleTime: 60_000,
  });
  const { day, empty } = useTodayNutritionDay(query);

  if (query.isPending) {
    return <TodayNutritionCardSkeleton />;
  }

  if (query.isError) {
    return null;
  }

  return (
    <section className="flex h-full min-w-0 flex-col">
      <TodayNutritionCardBody
        day={day}
        empty={empty}
        linkTitle={resolveNutritionLinkTitle({ empty })}
      />
    </section>
  );
}

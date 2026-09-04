'use client';

import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { TodayNutritionCardBody } from '@/components/today/dashboard/today-nutrition-card-body';
import { resolveNutritionLinkTitle } from '@/components/today/dashboard/today-nutrition-card-helpers';
import { useTodayNutritionDay } from '@/components/today/dashboard/nutrition-day-resolver';
import { fetchNutritionPresentation } from '@/lib/query/presentation-fetchers';
import { cn } from '@/lib/utils';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

export function TodayNutritionCard() {
  const trainingDayId = format(new Date(), 'yyyy-MM-dd');
  const query = useQuery({
    queryKey: ['presentation', 'nutrition', trainingDayId],
    queryFn: () => fetchNutritionPresentation(trainingDayId),
    staleTime: 60_000,
  });
  const { day, disconnected } = useTodayNutritionDay(query);

  return (
    <section
      aria-busy={query.isPending || undefined}
      className="flex h-full min-w-0 flex-col px-0.5"
    >
      <h2 className="text-label">Nutrition</h2>
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

export function TodayNutritionCardSkeleton() {
  return (
    <section className="flex h-full min-w-0 flex-col px-0.5" aria-busy>
      <h2 className="text-label">Nutrition</h2>
      <div
        className={cn(
          'chip-surface-lg mt-2 flex min-h-0 w-full flex-1 flex-col',
          'rounded-2xl px-4 py-4',
        )}
      >
        <div className="space-y-2">
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-28" />
          <SkeletonDataValue heightClassName="h-8" widthClassName="w-32" />
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-36" />
        </div>
        <div className="border-border/50 mt-3.5 grid grid-cols-3 gap-2 border-t pt-3.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="bg-muted size-14 animate-pulse rounded-full" />
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-14" />
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

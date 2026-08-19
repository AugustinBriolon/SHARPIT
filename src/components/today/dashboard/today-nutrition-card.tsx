'use client';

import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Apple } from 'lucide-react';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import {
  ColoredMacroPills,
  ColoredMacroStackBar,
} from '@/components/nutrition/nutrition-macro-display';
import { fetchNutritionPresentation } from '@/lib/query/presentation-fetchers';
import { formatRemainingCalories } from '@/lib/nutrition/goals-progress';
import { CALORIE_RING } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

export function TodayNutritionCard() {
  const trainingDayId = format(new Date(), 'yyyy-MM-dd');

  const { data, isPending } = useQuery({
    queryKey: ['presentation', 'nutrition', trainingDayId],
    queryFn: () => fetchNutritionPresentation(trainingDayId),
    staleTime: 60_000,
  });

  if (!isPending && (!data?.connected || !data.today)) return null;

  const today = data?.today;
  const goals = today?.goalsProgress;

  return (
    <section aria-busy={isPending || undefined} className="px-0.5">
      <h2 className="text-label">Nutrition</h2>
      <Link
        href="/nutrition"
        title="Voir le journal alimentaire"
        className={cn(
          'chip-surface-lg hover:border-primary/35 group mt-2 flex w-full min-w-0 flex-col gap-2.5',
          'rounded-2xl px-3.5 py-3 transition-[border-color,background-color] duration-150 ease-out',
          'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden sm:flex-row sm:items-center',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="icon-well size-9 shrink-0" aria-hidden>
            <Apple className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {today ? (
                <>
                  <span
                    className={cn(
                      'text-data text-lg font-semibold tabular-nums',
                      CALORIE_RING.text,
                    )}
                  >
                    {today.calories}
                  </span>
                  <span className="text-muted-foreground text-xs">kcal</span>
                  {goals ? (
                    <span className="text-muted-foreground text-xs">
                      / {goals.calorieBudget} · {formatRemainingCalories(goals.calories.remaining)}
                    </span>
                  ) : null}
                </>
              ) : (
                <SkeletonDataValue heightClassName="h-5" widthClassName="w-16" />
              )}
            </div>
            {today ? (
              <ColoredMacroStackBar
                carbs={today.carbohydrates}
                className="max-w-xs"
                fat={today.fat}
                protein={today.protein}
              />
            ) : (
              <div className="bg-muted h-2 max-w-xs animate-pulse rounded-full" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center">
          {today ? (
            <ColoredMacroPills
              carbs={today.carbohydrates}
              className="sm:justify-end"
              fat={today.fat}
              protein={today.protein}
            />
          ) : (
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-36" />
          )}
          <span
            className="text-muted-foreground/70 text-data shrink-0 text-xs tracking-wider transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5"
            aria-hidden
          >
            →
          </span>
        </div>
      </Link>
    </section>
  );
}

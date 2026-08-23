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

  const today = data?.today;
  const goals = today?.goalsProgress;

  /* The card stays even with nothing logged. Disappearing on an empty day taught
     the wrong lesson twice over: the section moved every time the page was
     opened before lunch, and the one moment worth prompting a log — before
     anything is eaten — was the moment the prompt was hidden. */
  const empty = !isPending && (!data?.connected || !today);
  const emptyCopy = data?.connected
    ? 'Rien enregistré aujourd’hui'
    : 'Journal alimentaire non connecté';

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
              ) : null}
              {empty ? <span className="text-muted-foreground text-sm">{emptyCopy}</span> : null}
              {isPending ? <SkeletonDataValue heightClassName="h-5" widthClassName="w-16" /> : null}
            </div>
            {today ? (
              <ColoredMacroStackBar
                carbs={today.carbohydrates}
                className="max-w-xs"
                fat={today.fat}
                protein={today.protein}
              />
            ) : null}
            {isPending ? (
              <div className="bg-muted h-2 max-w-xs animate-pulse rounded-full" />
            ) : null}
            {/* An empty rail rather than none: the bar is where the day will be
                drawn, and leaving a gap there makes the card jump on first log. */}
            {empty ? <div className="bg-muted/40 h-2 max-w-xs rounded-full" /> : null}
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
          ) : null}
          {isPending ? <SkeletonDataValue heightClassName="h-3" widthClassName="w-36" /> : null}
          {empty ? (
            <span className="text-muted-foreground text-xs">
              {data?.connected ? 'Ouvrir le journal' : 'Connecter'}
            </span>
          ) : null}
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

/**
 * The card's shape without its figures, for the Today shell.
 *
 * Rendered rather than imported from the live card so the shell stays free of
 * the query — a fallback that fetches is not a fallback.
 */
export function TodayNutritionCardSkeleton() {
  return (
    <section className="px-0.5" aria-busy>
      <h2 className="text-label">Nutrition</h2>
      <div
        className={cn(
          'chip-surface-lg mt-2 flex w-full min-w-0 flex-col gap-2.5',
          'rounded-2xl px-3.5 py-3 sm:flex-row sm:items-center',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="icon-well size-9 shrink-0" aria-hidden>
            <Apple className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonDataValue heightClassName="h-5" widthClassName="w-16" />
            <div className="bg-muted h-2 max-w-xs animate-pulse rounded-full" />
          </div>
        </div>
        <div className="sm:shrink-0">
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-36" />
        </div>
      </div>
    </section>
  );
}

'use client';

import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { budgetCaptionClass } from '@/components/today/dashboard/today-nutrition-card-helpers';
import { formatRemainingCalories } from '@/lib/nutrition/goals-progress';
import { CALORIE_RING } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

function CalorieDisplay({
  calories,
  calorieBudget,
}: {
  calories: number;
  calorieBudget: number | null;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span
        className={cn(
          'text-data text-2xl leading-none font-semibold tabular-nums',
          CALORIE_RING.text,
        )}
      >
        {calories.toLocaleString('fr-FR')}
      </span>
      <span className="text-muted-foreground text-xs">
        kcal
        {calorieBudget ? ` / ${calorieBudget.toLocaleString('fr-FR')}` : null}
      </span>
    </p>
  );
}

function HeaderStatusMessage({
  disconnected,
  isError,
  isPending,
}: {
  disconnected: boolean;
  isError: boolean;
  isPending: boolean;
}) {
  if (disconnected) {
    return (
      <p className="text-muted-foreground text-sm leading-snug">Journal alimentaire non connecté</p>
    );
  }
  if (isError) {
    return (
      <p className="text-muted-foreground text-sm leading-snug">
        Journal indisponible pour le moment
      </p>
    );
  }
  if (isPending) {
    return <SkeletonDataValue heightClassName="h-7" widthClassName="w-24" />;
  }
  return null;
}

export function TodayNutritionCardHeader({
  day,
  disconnected,
  goals,
  isError,
  isPending,
}: {
  day: { calories: number } | null;
  disconnected: boolean;
  goals: { calorieBudget: number; calories: { remaining: number | null } } | null;
  isError: boolean;
  isPending: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {day ? (
          <CalorieDisplay calorieBudget={goals?.calorieBudget ?? null} calories={day.calories} />
        ) : null}
        <HeaderStatusMessage disconnected={disconnected} isError={isError} isPending={isPending} />
        {day && goals ? (
          <p
            className={cn(
              'text-data mt-1 text-[0.6875rem] tabular-nums',
              budgetCaptionClass(goals.calories.remaining),
            )}
          >
            {formatRemainingCalories(goals.calories.remaining)}
          </p>
        ) : null}
      </div>
      {day && !isError ? (
        <span
          className="text-muted-foreground/70 text-data mt-1 shrink-0 text-xs tracking-wider transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      ) : null}
    </div>
  );
}

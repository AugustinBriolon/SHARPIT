'use client';

import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { NutritionCalorieHero } from '@/components/today/dashboard/today-nutrition-card-parts';

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
      <p className="text-muted-foreground pt-3 text-sm leading-snug">
        Journal alimentaire non connecté
      </p>
    );
  }
  if (isError) {
    return (
      <p className="text-muted-foreground pt-3 text-sm leading-snug">
        Journal indisponible pour le moment
      </p>
    );
  }
  if (isPending) {
    return (
      <div className="space-y-2 pt-3">
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-28" />
        <SkeletonDataValue heightClassName="h-8" widthClassName="w-32" />
        <SkeletonDataValue heightClassName="h-3" widthClassName="w-36" />
      </div>
    );
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
  if (day) {
    return (
      <NutritionCalorieHero
        calorieBudget={goals?.calorieBudget ?? null}
        calories={day.calories}
        remaining={goals?.calories.remaining ?? null}
      />
    );
  }

  return (
    <HeaderStatusMessage disconnected={disconnected} isError={isError} isPending={isPending} />
  );
}

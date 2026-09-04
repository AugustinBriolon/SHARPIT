'use client';

import { TodayNutritionCardHeader } from '@/components/today/dashboard/today-nutrition-card-header';
import {
  NutritionFooterLink,
  NutritionMacroSkeleton,
} from '@/components/today/dashboard/today-nutrition-card-footer';
import { NutritionMacroGrid } from '@/components/today/dashboard/today-nutrition-macro-grid';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type NutritionDay = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  goalsProgress: {
    calorieBudget: number;
    calories: { remaining: number | null };
    protein: { goal: number | null; pct: number | null };
    carbohydrates: { goal: number | null; pct: number | null };
    fat: { goal: number | null; pct: number | null };
  } | null;
};

export function TodayNutritionCardBody({
  day,
  disconnected,
  isError,
  isPending,
  linkTitle,
}: {
  day: NutritionDay | null;
  disconnected: boolean;
  isError: boolean;
  isPending: boolean;
  linkTitle: string;
}) {
  const goals = day?.goalsProgress ?? null;

  return (
    <Link
      href="/nutrition"
      title={linkTitle}
      className={cn(
        'chip-surface-lg hover:border-primary/35 group mt-2 flex min-h-0 w-full flex-1 flex-col',
        'rounded-2xl px-4 py-4 transition-[border-color,background-color] duration-150 ease-out',
        'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <TodayNutritionCardHeader
          day={day}
          disconnected={disconnected}
          goals={goals}
          isError={isError}
          isPending={isPending}
        />
        {day ? <NutritionMacroGrid day={day} goals={goals} /> : null}
        {isPending ? <NutritionMacroSkeleton /> : null}
        {disconnected ? <NutritionFooterLink label="Connecter" /> : null}
        {isError ? <NutritionFooterLink label="Ouvrir le journal" /> : null}
      </div>
    </Link>
  );
}

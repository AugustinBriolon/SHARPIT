'use client';

import { Utensils } from 'lucide-react';
import {
  TodayInstrumentCard,
  TodayInstrumentCardSkeleton,
} from '@/components/today/dashboard/today-instrument-card';
import { TodayNutritionCardHeader } from '@/components/today/dashboard/today-nutrition-card-header';
import { NutritionFooterLink } from '@/components/today/dashboard/today-nutrition-card-footer';
import { NutritionMacroGrid } from '@/components/today/dashboard/today-nutrition-macro-grid';
import { CALORIE_RING } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

const EMPTY_DAY = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
} as const;

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

function NutritionBodyFooter({
  disconnected,
  isError,
}: {
  disconnected: boolean;
  isError: boolean;
}) {
  if (disconnected) {
    return <NutritionFooterLink label="Connecter" />;
  }
  if (isError) {
    return <NutritionFooterLink label="Ouvrir le journal" />;
  }
  return null;
}

function NutritionBodyContent({
  day,
  disconnected,
  isError,
}: {
  day: NutritionDay | null;
  disconnected: boolean;
  isError: boolean;
}) {
  const goals = day?.goalsProgress ?? null;

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
      <TodayNutritionCardHeader
        day={day}
        disconnected={disconnected}
        goals={goals}
        isError={isError}
        isPending={false}
      />
      {day ? <NutritionMacroGrid day={day} goals={goals} /> : null}
      <NutritionBodyFooter disconnected={disconnected} isError={isError} />
    </div>
  );
}

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
  if (isPending && !day) {
    return <TodayNutritionPendingShell />;
  }

  return (
    <TodayInstrumentCard
      className="min-h-0 flex-1"
      href="/nutrition"
      icon={<Utensils className="size-3.5" strokeWidth={2.25} />}
      subtitle={day ? 'Total aujourd’hui' : null}
      title="Nutrition"
      titleAttr={linkTitle}
    >
      <NutritionBodyContent day={day} disconnected={disconnected} isError={isError} />
    </TodayInstrumentCard>
  );
}

/** Static chrome + empty rings — no pulsing text blocks. */
function TodayNutritionPendingShell() {
  return (
    <TodayInstrumentCard
      className="min-h-0 flex-1"
      href="/nutrition"
      icon={<Utensils className="size-3.5" strokeWidth={2.25} />}
      subtitle="Total aujourd’hui"
      title="Nutrition"
      titleAttr="Journal alimentaire"
    >
      <div className="min-w-0 pt-3">
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span
            className={cn(
              'text-data text-[1.75rem] leading-none font-semibold tabular-nums',
              CALORIE_RING.text,
              'opacity-40',
            )}
          >
            —
          </span>
          <span className="text-muted-foreground text-sm">kcal</span>
        </p>
      </div>
      <NutritionMacroGrid day={EMPTY_DAY} goals={null} />
    </TodayInstrumentCard>
  );
}

export function TodayNutritionCardSkeleton() {
  return (
    <section className="flex h-full min-w-0 flex-col" aria-busy>
      <TodayInstrumentCardSkeleton className="min-h-0 flex-1" title="Nutrition">
        <div className="min-w-0 pt-3">
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-data text-muted-foreground text-[1.75rem] leading-none font-semibold tabular-nums">
              —
            </span>
            <span className="text-muted-foreground text-sm">kcal</span>
          </p>
        </div>
        <NutritionMacroGrid day={EMPTY_DAY} goals={null} />
      </TodayInstrumentCardSkeleton>
    </section>
  );
}

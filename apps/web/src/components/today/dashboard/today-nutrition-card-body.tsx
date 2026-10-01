'use client';

import { Utensils } from 'lucide-react';
import {
  TodayInstrumentCard,
  TodayInstrumentCardSkeleton,
} from '@/components/today/dashboard/today-instrument-card';
import { TodayNutritionCardHeader } from '@/components/today/dashboard/today-nutrition-card-header';
import { NutritionFooterLink } from '@/components/today/dashboard/today-nutrition-card-footer';
import { NutritionMacroGrid } from '@/components/today/dashboard/today-nutrition-macro-grid';
import { CALORIE_RING } from '@sharpit/app/lib/nutrition/macro-colors';
import { cn } from '@sharpit/app/lib/utils';

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

function NutritionBodyContent({ day, empty }: { day: NutritionDay; empty: boolean }) {
  const goals = day.goalsProgress ?? null;

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
      <TodayNutritionCardHeader day={day} goals={goals} />
      <NutritionMacroGrid day={day} goals={goals} />
      {/* Nothing logged yet: the card is the way in to the first meal. */}
      {empty ? <NutritionFooterLink label="Rien de noté aujourd’hui · Noter un repas" /> : null}
    </div>
  );
}

export function TodayNutritionCardBody({
  day,
  empty,
  linkTitle,
}: {
  day: NutritionDay | null;
  empty: boolean;
  linkTitle: string;
}) {
  if (!day) {
    return <TodayNutritionPendingShell />;
  }

  return (
    <TodayInstrumentCard
      className="min-h-0 flex-1"
      href="/nutrition"
      icon={<Utensils className="size-3.5" strokeWidth={2.25} />}
      subtitle="Total aujourd’hui"
      title="Nutrition"
      titleAttr={linkTitle}
    >
      <NutritionBodyContent day={day} empty={empty} />
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

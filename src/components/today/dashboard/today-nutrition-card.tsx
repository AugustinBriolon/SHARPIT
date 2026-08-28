'use client';

import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { fetchNutritionPresentation } from '@/lib/query/presentation-fetchers';
import { formatRemainingCalories } from '@/lib/nutrition/goals-progress';
import {
  CALORIE_RING,
  MACRO_COLORS,
  MACRO_LABELS,
  MACRO_SHORT,
  type MacroKind,
} from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

function calorieValueText(pct: number, remaining: number | null): string {
  if (remaining === null) {
    return `${pct} %`;
  }
  if (remaining < 0) {
    return `${pct} %, ${formatRemainingCalories(remaining)}`;
  }
  return formatRemainingCalories(remaining);
}

function CalorieTrack({ pct, remaining }: { pct: number; remaining: number | null }) {
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div
      aria-label="Progression calorique du jour"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      aria-valuetext={calorieValueText(clamped, remaining)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full', CALORIE_RING.track)}
      role="progressbar"
    >
      <div
        style={{ width: `${clamped}%` }}
        className={cn(
          'h-full rounded-full transition-[width] duration-300 ease-out',
          CALORIE_RING.bar,
        )}
      />
    </div>
  );
}

function MacroCell({
  kind,
  grams,
  goal,
  pct,
}: {
  kind: MacroKind;
  grams: number;
  goal: number | null;
  pct: number | null;
}) {
  const fill = pct !== null ? Math.max(0, Math.min(100, pct)) : null;
  const colors = MACRO_COLORS[kind];
  const rounded = Math.round(grams);
  const label = MACRO_LABELS[kind];
  const status = goal !== null ? `${label} ${rounded} g sur ${goal} g` : `${label} ${rounded} g`;
  let fillText: string | undefined;
  if (fill !== null) {
    fillText = `${fill} %`;
  } else if (goal === null) {
    fillText = 'Sans objectif';
  }

  return (
    <div aria-label={status} className="min-w-0 flex-1 space-y-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className={cn('text-label tracking-wide', colors.text)} aria-hidden>
          {MACRO_SHORT[kind]}
        </span>
        <span className="sr-only">{label}</span>
        {goal !== null ? (
          <span className="text-muted-foreground text-data text-[0.6875rem] tabular-nums">
            /{goal}
          </span>
        ) : null}
      </div>
      <p className="text-data text-foreground text-lg leading-none font-semibold tabular-nums">
        {rounded}
        <span className="text-muted-foreground ml-0.5 text-[0.6875rem] font-normal">g</span>
      </p>
      <div
        aria-label={`Progression ${label}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={fill ?? undefined}
        aria-valuetext={fillText}
        className={cn('h-1 w-full overflow-hidden rounded-full', colors.track)}
        role="progressbar"
      >
        <div
          className={cn('h-full rounded-full', colors.bar)}
          style={{ width: fill !== null ? `${fill}%` : '100%', opacity: fill !== null ? 1 : 0.45 }}
        />
      </div>
    </div>
  );
}

function MacroStackShare({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  if (total <= 0) {
    return null;
  }

  const segments: Array<{ kind: MacroKind; grams: number }> = [
    { kind: 'protein', grams: protein },
    { kind: 'carbs', grams: carbs },
    { kind: 'fat', grams: fat },
  ];

  const summary = segments
    .map(({ kind, grams }) => {
      const share = Math.round((grams / total) * 100);
      return `${MACRO_LABELS[kind]} ${share} %`;
    })
    .join(', ');

  return (
    <div
      aria-label={`Répartition macros : ${summary}`}
      className="flex h-1.5 w-full overflow-hidden rounded-full"
      role="img"
    >
      {segments.map(({ kind, grams }) => (
        <div
          key={kind}
          className={MACRO_COLORS[kind].bar}
          style={{ width: `${(grams / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function budgetCaptionClass(remaining: number | null): string {
  /* Over budget stays informational — clearer ink, not caution/risk Frein chrome. */
  if (remaining !== null && remaining < 0) {
    return 'text-foreground';
  }
  return 'text-muted-foreground';
}

/** Connected journal, nothing logged yet — show the card shape at zero, not empty copy. */
const ZERO_DAY = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  goalsProgress: null,
} as const;

export function TodayNutritionCard() {
  const trainingDayId = format(new Date(), 'yyyy-MM-dd');

  const { data, isPending, isError } = useQuery({
    queryKey: ['presentation', 'nutrition', trainingDayId],
    queryFn: () => fetchNutritionPresentation(trainingDayId),
    staleTime: 60_000,
  });

  const today = data?.today;
  const disconnected = !isPending && !isError && data !== null && !data.connected;
  /* Keep the card when connected with nothing logged: zeros beat “rien aujourd’hui”,
     and the section stops jumping once the first meal lands. */
  const day = today ?? (!isPending && !isError && data?.connected ? ZERO_DAY : null);
  const goals = day?.goalsProgress ?? null;
  const hasMacroIntake = day !== null && day.protein + day.carbohydrates + day.fat > 0;

  let intakeTrack: ReactNode = null;
  if (day && goals?.calories.pct !== null) {
    intakeTrack = <CalorieTrack pct={goals.calories.pct} remaining={goals.calories.remaining} />;
  } else if (day && !goals && hasMacroIntake) {
    intakeTrack = <MacroStackShare carbs={day.carbohydrates} fat={day.fat} protein={day.protein} />;
  } else if (day && !goals) {
    intakeTrack = <CalorieTrack pct={0} remaining={null} />;
  }

  const errorCopy = 'Journal indisponible pour le moment';
  const errorCta = 'Ouvrir le journal';

  const linkTitle = (() => {
    if (isError) {
      return 'Ouvrir le journal alimentaire';
    }
    if (disconnected) {
      return 'Connecter le journal alimentaire';
    }
    return 'Voir le journal alimentaire';
  })();

  return (
    <section aria-busy={isPending || undefined} className="flex h-full min-w-0 flex-col px-0.5">
      <h2 className="text-label">Nutrition</h2>
      <Link
        href="/nutrition"
        title={linkTitle}
        className={cn(
          'chip-surface-lg hover:border-primary/35 group mt-2 flex min-h-0 w-full flex-1 flex-col',
          'rounded-2xl px-3.5 py-3 transition-[border-color,background-color] duration-150 ease-out',
          'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {day ? (
                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span
                      className={cn(
                        'text-data text-2xl leading-none font-semibold tabular-nums',
                        CALORIE_RING.text,
                      )}
                    >
                      {day.calories.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      kcal
                      {goals ? ` / ${goals.calorieBudget.toLocaleString('fr-FR')}` : null}
                    </span>
                  </p>
                ) : null}
                {disconnected ? (
                  <p className="text-muted-foreground text-sm leading-snug">
                    Journal alimentaire non connecté
                  </p>
                ) : null}
                {isError ? (
                  <p className="text-muted-foreground text-sm leading-snug">{errorCopy}</p>
                ) : null}
                {isPending ? (
                  <SkeletonDataValue heightClassName="h-7" widthClassName="w-24" />
                ) : null}
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

            {intakeTrack}
            {isPending ? (
              <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
            ) : null}
            {disconnected || isError ? (
              <div className="bg-muted/40 h-1.5 w-full rounded-full" />
            ) : null}
          </div>

          {day ? (
            <div className="border-border/50 grid grid-cols-3 gap-2.5 border-t pt-2.5">
              <MacroCell
                goal={goals?.protein.goal ?? null}
                grams={day.protein}
                kind="protein"
                pct={goals?.protein.pct ?? null}
              />
              <MacroCell
                goal={goals?.carbohydrates.goal ?? null}
                grams={day.carbohydrates}
                kind="carbs"
                pct={goals?.carbohydrates.pct ?? null}
              />
              <MacroCell
                goal={goals?.fat.goal ?? null}
                grams={day.fat}
                kind="fat"
                pct={goals?.fat.pct ?? null}
              />
            </div>
          ) : null}

          {isPending ? (
            <div className="border-border/50 grid grid-cols-3 gap-2.5 border-t pt-2.5">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <SkeletonDataValue heightClassName="h-3" widthClassName="w-6" />
                  <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
                  <div className="bg-muted h-1 w-full animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : null}

          {disconnected ? (
            <div className="border-border/50 flex items-end justify-between gap-3 border-t pt-2.5">
              <p className="text-muted-foreground text-xs leading-snug">Connecter</p>
              <span className="text-primary text-xs font-medium">→</span>
            </div>
          ) : null}

          {isError ? (
            <div className="border-border/50 flex items-end justify-between gap-3 border-t pt-2.5">
              <p className="text-muted-foreground text-xs leading-snug">{errorCta}</p>
              <span className="text-primary text-xs font-medium">→</span>
            </div>
          ) : null}
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
    <section className="flex h-full min-w-0 flex-col px-0.5" aria-busy>
      <h2 className="text-label">Nutrition</h2>
      <div
        className={cn(
          'chip-surface-lg mt-2 flex min-h-0 w-full flex-1 flex-col',
          'rounded-2xl px-3.5 py-3',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5">
          <div className="space-y-2">
            <SkeletonDataValue heightClassName="h-7" widthClassName="w-24" />
            <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
          </div>
          <div className="border-border/50 grid grid-cols-3 gap-2.5 border-t pt-2.5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonDataValue heightClassName="h-3" widthClassName="w-6" />
                <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
                <div className="bg-muted h-1 w-full animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

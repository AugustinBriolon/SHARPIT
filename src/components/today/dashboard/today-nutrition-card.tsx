'use client';

import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { fetchNutritionPresentation } from '@/lib/query/presentation-fetchers';
import { formatRemainingCalories } from '@/lib/nutrition/goals-progress';
import {
  CALORIE_RING,
  MACRO_COLORS,
  MACRO_SHORT,
  type MacroKind,
} from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

function CalorieTrack({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      aria-label="Progression calorique du jour"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
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
  const fill = pct != null ? Math.max(0, Math.min(100, pct)) : null;
  const colors = MACRO_COLORS[kind];

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className={cn('text-[11px] font-medium', colors.text)}>{MACRO_SHORT[kind]}</span>
        {goal != null ? (
          <span className="text-muted-foreground text-[10px] tabular-nums">/{goal}</span>
        ) : null}
      </div>
      <p className="text-data text-foreground text-lg leading-none font-semibold tabular-nums">
        {Math.round(grams)}
        <span className="text-muted-foreground ml-0.5 text-[11px] font-normal">g</span>
      </p>
      <div className={cn('h-1 w-full overflow-hidden rounded-full', colors.track)} aria-hidden>
        <div
          className={cn('h-full rounded-full', colors.bar)}
          style={{ width: fill != null ? `${fill}%` : '100%', opacity: fill != null ? 1 : 0.45 }}
        />
      </div>
    </div>
  );
}

function MacroStackShare({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  if (total <= 0) return null;

  const segments: Array<{ kind: MacroKind; grams: number }> = [
    { kind: 'protein', grams: protein },
    { kind: 'carbs', grams: carbs },
    { kind: 'fat', grams: fat },
  ];

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full" role="presentation" aria-hidden>
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
  const emptyCta = data?.connected ? 'Ouvrir le journal' : 'Connecter';

  return (
    <section aria-busy={isPending || undefined} className="flex h-full min-w-0 flex-col px-0.5">
      <h2 className="text-label">Nutrition</h2>
      <Link
        href="/nutrition"
        title="Voir le journal alimentaire"
        className={cn(
          'chip-surface-lg hover:border-primary/35 group mt-2 flex min-h-0 w-full flex-1 flex-col',
          'rounded-2xl px-3.5 py-3 transition-[border-color,background-color] duration-150 ease-out',
          'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {today ? (
                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span
                      className={cn(
                        'text-data text-2xl leading-none font-semibold tabular-nums',
                        CALORIE_RING.text,
                      )}
                    >
                      {today.calories.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      kcal
                      {goals ? ` / ${goals.calorieBudget.toLocaleString('fr-FR')}` : null}
                    </span>
                  </p>
                ) : null}
                {empty ? (
                  <p className="text-muted-foreground text-sm leading-snug">{emptyCopy}</p>
                ) : null}
                {isPending ? (
                  <SkeletonDataValue heightClassName="h-7" widthClassName="w-24" />
                ) : null}
                {today && goals ? (
                  <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                    {formatRemainingCalories(goals.calories.remaining)}
                  </p>
                ) : null}
              </div>
              {!empty ? (
                <span
                  className="text-muted-foreground/70 text-data mt-1 shrink-0 text-xs tracking-wider transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5"
                  aria-hidden
                >
                  →
                </span>
              ) : null}
            </div>

            {today && goals?.calories.pct != null ? (
              <CalorieTrack pct={goals.calories.pct} />
            ) : null}
            {today && !goals ? (
              <MacroStackShare
                carbs={today.carbohydrates}
                fat={today.fat}
                protein={today.protein}
              />
            ) : null}
            {isPending ? (
              <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
            ) : null}
            {empty ? <div className="bg-muted/40 h-1.5 w-full rounded-full" /> : null}
          </div>

          {today ? (
            <div className="border-border/50 grid grid-cols-3 gap-3 border-t pt-3">
              <MacroCell
                goal={goals?.protein.goal ?? null}
                grams={today.protein}
                kind="protein"
                pct={goals?.protein.pct ?? null}
              />
              <MacroCell
                goal={goals?.carbohydrates.goal ?? null}
                grams={today.carbohydrates}
                kind="carbs"
                pct={goals?.carbohydrates.pct ?? null}
              />
              <MacroCell
                goal={goals?.fat.goal ?? null}
                grams={today.fat}
                kind="fat"
                pct={goals?.fat.pct ?? null}
              />
            </div>
          ) : null}

          {isPending ? (
            <div className="border-border/50 grid grid-cols-3 gap-3 border-t pt-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <SkeletonDataValue heightClassName="h-3" widthClassName="w-6" />
                  <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
                  <div className="bg-muted h-1 w-full animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : null}

          {empty ? (
            <div className="border-border/50 flex items-end justify-between gap-3 border-t pt-3">
              <p className="text-muted-foreground text-xs leading-snug">{emptyCta}</p>
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
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          <div className="space-y-2">
            <SkeletonDataValue heightClassName="h-7" widthClassName="w-24" />
            <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
          </div>
          <div className="border-border/50 grid grid-cols-3 gap-3 border-t pt-3">
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

'use client';

import { formatRemainingCalories } from '@/lib/nutrition/goals-progress';
import {
  CALORIE_RING,
  MACRO_COLORS,
  MACRO_LABELS,
  MACRO_SHORT,
  type MacroKind,
} from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

function resolveMacroFillText(fill: number | null, goal: number | null) {
  if (fill !== null) {
    return `${fill} %`;
  }
  if (goal === null) {
    return 'Sans objectif';
  }
  return undefined;
}

function calorieValueText(pct: number, remaining: number | null): string {
  if (remaining === null) {
    return `${pct} %`;
  }
  if (remaining < 0) {
    return `${pct} %, ${formatRemainingCalories(remaining)}`;
  }
  return formatRemainingCalories(remaining);
}

export function CalorieTrack({ pct, remaining }: { pct: number; remaining: number | null }) {
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

export function MacroCell({
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
  const fillText = resolveMacroFillText(fill, goal);

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

export function MacroStackShare({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
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
    .map(({ kind, grams }) => `${MACRO_LABELS[kind]} ${Math.round((grams / total) * 100)} %`)
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

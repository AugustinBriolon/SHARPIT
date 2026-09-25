'use client';

import { Beef, Droplet, Wheat, type LucideIcon } from 'lucide-react';
import { formatRemainingCalories } from '@/lib/nutrition/goals-progress';
import {
  CALORIE_RING,
  MACRO_CSS_COLOR,
  MACRO_COLORS,
  MACRO_LABELS,
  type MacroKind,
} from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

const MACRO_ICONS: Record<MacroKind, LucideIcon> = {
  protein: Beef,
  carbs: Wheat,
  fat: Droplet,
};

const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

export function MacroProgressRing({ kind, pct }: { kind: MacroKind; pct: number | null }) {
  const fill = pct !== null ? Math.max(0, Math.min(100, pct)) : 0;
  const offset = RING_C * (1 - fill / 100);
  const stroke = MACRO_CSS_COLOR[kind];

  return (
    <svg className="size-14" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden>
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        fill="none"
        r={RING_R}
        stroke={stroke}
        strokeOpacity={0.18}
        strokeWidth={RING_STROKE}
      />
      {fill > 0 ? (
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_R}
          stroke={stroke}
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={RING_STROKE}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      ) : null}
    </svg>
  );
}

export function MacroRingCell({
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
  const colors = MACRO_COLORS[kind];
  const label = MACRO_LABELS[kind];
  const Icon = MACRO_ICONS[kind];
  const rounded = Math.round(grams);
  const value = goal !== null ? `${rounded}/${Math.round(goal)}g` : `${rounded}g`;
  const status = goal !== null ? `${label} ${rounded} g sur ${goal} g` : `${label} ${rounded} g`;
  // Zero logged grams must read empty — never inherit a ghost fill from goalsProgress.
  const ringPct = grams <= 0 ? 0 : pct;

  return (
    <div aria-label={status} className="flex min-w-0 flex-col items-center gap-2 text-center">
      <MacroProgressRing kind={kind} pct={ringPct} />
      <span className="inline-flex items-center gap-1">
        <Icon className={cn('size-3.5', colors.text)} strokeWidth={2.25} aria-hidden />
        <span className="text-foreground text-xs font-medium">{label}</span>
      </span>
      <span className="text-muted-foreground text-data text-[11px] tabular-nums">{value}</span>
    </div>
  );
}

export function NutritionCalorieHero({
  calories,
  calorieBudget,
  remaining,
}: {
  calories: number;
  calorieBudget: number | null;
  remaining: number | null;
}) {
  return (
    <div className="min-w-0 pt-3">
      <p className="mt-0 flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            'text-data text-[1.75rem] leading-none font-semibold tabular-nums',
            CALORIE_RING.text,
          )}
        >
          {calories.toLocaleString('fr-FR')}
        </span>
        <span className="text-muted-foreground text-sm">kcal</span>
      </p>
      {calorieBudget !== null ? (
        <p className="text-foreground mt-1.5 text-xs font-medium tabular-nums">
          Objectif : {calorieBudget.toLocaleString('fr-FR')} kcal
        </p>
      ) : null}
      {remaining !== null && remaining < 0 ? (
        <p className="text-foreground text-data mt-1 text-[11px] tabular-nums">
          {formatRemainingCalories(remaining)}
        </p>
      ) : null}
    </div>
  );
}

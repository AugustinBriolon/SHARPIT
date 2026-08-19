'use client';

import type { MacroKind } from '@/lib/nutrition/macro-colors';
import { MACRO_COLORS, MACRO_LABELS } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

export function MacroProgressBar({
  kind,
  consumed,
  goal,
  remaining,
  pct,
  unit,
  loading = false,
}: {
  kind: MacroKind;
  consumed: number;
  goal: number | null;
  remaining: number | null;
  pct: number | null;
  unit: 'g';
  loading?: boolean;
}) {
  const colors = MACRO_COLORS[kind];
  const width = goal != null && pct != null ? Math.min(100, pct) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('size-2.5 rounded-full', colors.dot)} aria-hidden />
          <span className="text-sm font-medium">{MACRO_LABELS[kind]}</span>
        </div>
        {loading ? (
          <div className="bg-muted h-4 w-24 animate-pulse rounded-full" />
        ) : (
          <span className={cn('text-data text-sm font-semibold tabular-nums', colors.text)}>
            {Math.round(consumed)} / {goal != null ? `${Math.round(goal)} ${unit}` : '—'}
          </span>
        )}
      </div>
      <div className={cn('h-2.5 overflow-hidden rounded-full', colors.track)}>
        {!loading && goal != null ? (
          <div
            className={cn('h-full rounded-full transition-[width] duration-300', colors.bar)}
            style={{ width: `${width}%` }}
          />
        ) : null}
      </div>
      {!loading && remaining != null ? (
        <p className="text-muted-foreground text-xs tabular-nums">
          {remaining > 0
            ? `${Math.round(remaining)} ${unit} restants`
            : remaining === 0
              ? 'Objectif atteint'
              : `${Math.abs(Math.round(remaining))} ${unit} au-dessus`}
        </p>
      ) : null}
    </div>
  );
}

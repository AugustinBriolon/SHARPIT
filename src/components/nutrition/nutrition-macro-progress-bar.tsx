'use client';

import type { ReactNode } from 'react';
import type { MacroKind } from '@/lib/nutrition/macro-colors';
import { MACRO_COLORS, MACRO_LABELS } from '@/lib/nutrition/macro-colors';
import { formatMacroGPerKg } from '@/lib/nutrition/fuel-density-display';
import { cn } from '@/lib/utils';

function formatMacroRemainingText(remaining: number, unit: 'g'): string {
  if (remaining > 0) return `${Math.round(remaining)} ${unit} restants`;
  if (remaining === 0) return 'Objectif atteint';
  return `${Math.abs(Math.round(remaining))} ${unit} au-dessus`;
}

function macroFooterNote({
  loading,
  remaining,
  unit,
  densityGPerKg,
}: {
  loading: boolean;
  remaining: number | null;
  unit: 'g';
  densityGPerKg?: number | null;
}): ReactNode {
  if (loading) return null;
  if (remaining != null) {
    return (
      <p className="text-muted-foreground text-xs tabular-nums">
        {formatMacroRemainingText(remaining, unit)}
        {densityGPerKg != null ? (
          <span className="text-muted-foreground/80">
            {' '}
            · {formatMacroGPerKg(densityGPerKg)} g/kg
          </span>
        ) : null}
      </p>
    );
  }
  if (densityGPerKg != null) {
    return (
      <p className="text-muted-foreground/80 text-xs tabular-nums">
        {formatMacroGPerKg(densityGPerKg)} g/kg
      </p>
    );
  }
  return null;
}

export function MacroProgressBar({
  kind,
  consumed,
  goal,
  remaining,
  pct,
  unit,
  densityGPerKg,
  loading = false,
}: {
  kind: MacroKind;
  consumed: number;
  goal: number | null;
  remaining: number | null;
  pct: number | null;
  unit: 'g';
  densityGPerKg?: number | null;
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
      {macroFooterNote({ loading, remaining, unit, densityGPerKg })}
    </div>
  );
}

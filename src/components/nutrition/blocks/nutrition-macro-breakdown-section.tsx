'use client';

import { format, subDays } from 'date-fns';
import type { NutritionDaySummary } from '@/core/presentation/nutrition-view-model';
import { MACRO_COLORS, MACRO_LABELS, type MacroKind } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

const WEEKDAY_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;

const BAR_TRACK_HEIGHT = 64;
const MIN_FILL_HEIGHT = 6;

const ROWS: { kind: MacroKind; field: 'carbohydrates' | 'fat' | 'protein' }[] = [
  { kind: 'carbs', field: 'carbohydrates' },
  { kind: 'fat', field: 'fat' },
  { kind: 'protein', field: 'protein' },
];

type BreakdownDay = { key: string; weekday: string; entry: NutritionDaySummary | null };

function breakdownDays(date: Date, history: NutritionDaySummary[]): BreakdownDay[] {
  const byDate = new Map(history.map((d) => [d.date, d]));
  return Array.from({ length: 7 }, (_, i) => {
    const day = subDays(date, 6 - i);
    const key = format(day, 'yyyy-MM-dd');
    return { key, weekday: WEEKDAY_LETTER[day.getDay()]!, entry: byDate.get(key) ?? null };
  });
}

function goalFor(
  entry: NutritionDaySummary | null,
  field: 'carbohydrates' | 'fat' | 'protein',
): number | null {
  return entry?.goalsProgress?.[field].goal ?? null;
}

function MacroRow({
  kind,
  field,
  days,
}: {
  kind: MacroKind;
  field: 'carbohydrates' | 'fat' | 'protein';
  days: BreakdownDay[];
}) {
  const loggedValues = days
    .map((d) => d.entry?.[field] ?? null)
    .filter((v): v is number => v != null && v > 0);
  const average = loggedValues.length
    ? Math.round(loggedValues.reduce((s, v) => s + v, 0) / loggedValues.length)
    : null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', MACRO_COLORS[kind].dot)} aria-hidden />
          <p className="text-sm font-medium">{MACRO_LABELS[kind]}</p>
        </div>
        <p className="text-data text-muted-foreground text-xs tabular-nums">
          {average != null ? `Moy. ${average} g` : '—'}
        </p>
      </div>
      <div className="flex items-end gap-2" style={{ height: BAR_TRACK_HEIGHT }}>
        {days.map((d) => {
          const grams = d.entry?.[field] ?? null;
          const goal = goalFor(d.entry, field);
          const hasFill = grams != null && grams > 0 && goal != null && goal > 0;
          const fillHeight = hasFill
            ? Math.max(MIN_FILL_HEIGHT, Math.round(Math.min(1, grams / goal) * BAR_TRACK_HEIGHT))
            : 0;
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="bg-muted relative w-full overflow-hidden rounded-full"
                style={{ height: BAR_TRACK_HEIGHT }}
              >
                {hasFill ? (
                  <div
                    style={{ height: fillHeight }}
                    className={cn(
                      'absolute inset-x-0 bottom-0 rounded-full',
                      MACRO_COLORS[kind].bar,
                    )}
                  />
                ) : null}
              </div>
              <span className="text-muted-foreground text-[10px]">{d.weekday}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NutritionMacroBreakdownSection({
  date,
  history,
  loading = false,
}: {
  date: Date;
  history: NutritionDaySummary[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="analysis-panel rounded-analysis-lg space-y-4 p-4">
        <div className="bg-muted h-4 w-32 animate-pulse rounded-full" />
        <div className="bg-muted h-20 animate-pulse rounded-lg" />
      </section>
    );
  }

  if (history.length === 0) return null;

  const days = breakdownDays(date, history);

  return (
    <section className="analysis-panel rounded-analysis-lg space-y-5 p-4 sm:p-5">
      <p className="text-section-title">Évolution des macros</p>
      {ROWS.map(({ kind, field }) => (
        <MacroRow key={kind} days={days} field={field} kind={kind} />
      ))}
    </section>
  );
}

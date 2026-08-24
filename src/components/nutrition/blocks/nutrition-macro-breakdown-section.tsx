'use client';

import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { CursorFollowHint, type CursorHintState } from '@/components/ui/cursor-follow-hint';
import type { NutritionDaySummary } from '@/core/presentation/nutrition-view-model';
import { MACRO_COLORS, MACRO_LABELS, type MacroKind } from '@/lib/nutrition/macro-colors';
import { cn } from '@/lib/utils';

const WEEKDAY_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;
const DAY_TRACK_PX = 40;
const MIN_FILL_PX = 3;

const ROWS: { kind: MacroKind; field: 'carbohydrates' | 'fat' | 'protein' }[] = [
  { kind: 'carbs', field: 'carbohydrates' },
  { kind: 'fat', field: 'fat' },
  { kind: 'protein', field: 'protein' },
];

type BreakdownDay = { key: string; weekday: string; entry: NutritionDaySummary | null };
type HotKey = string | 'avg' | null;

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

export function macroColumnFillPx(grams: number | null, scalePeak: number): number {
  if (grams == null || grams <= 0 || scalePeak <= 0) return 0;
  return Math.max(MIN_FILL_PX, Math.round((grams / scalePeak) * DAY_TRACK_PX));
}

export function macroRowScalePeak(
  days: BreakdownDay[],
  field: 'carbohydrates' | 'fat' | 'protein',
): number {
  let peak = 0;
  for (const day of days) {
    peak = Math.max(peak, day.entry?.[field] ?? 0, goalFor(day.entry, field) ?? 0);
  }
  return peak;
}

function averageFor(
  days: BreakdownDay[],
  field: 'carbohydrates' | 'fat' | 'protein',
): number | null {
  const logged = days
    .map((d) => d.entry?.[field] ?? null)
    .filter((v): v is number => v != null && v > 0);
  if (logged.length === 0) return null;
  return Math.round(logged.reduce((s, v) => s + v, 0) / logged.length);
}

function macroLine(kind: MacroKind, grams: number | null, goal: number | null): string | null {
  if (grams == null) return null;
  const g = Math.round(grams);
  if (goal != null && goal > 0) return `${MACRO_LABELS[kind]} ${g}/${Math.round(goal)} g`;
  return `${MACRO_LABELS[kind]} ${g} g`;
}

export function macroDayReadout(day: BreakdownDay): string {
  const hint = dayHint(day);
  return `${hint.title} · ${hint.lines.join(' · ')}`;
}

function coloredMacroLine(kind: MacroKind, text: string) {
  return {
    text,
    swatchClassName: MACRO_COLORS[kind].dot,
    textClassName: MACRO_COLORS[kind].text,
  };
}

function dayHint(day: BreakdownDay): {
  title: string;
  lines: Array<string | { text: string; swatchClassName: string; textClassName: string }>;
} {
  const title = format(parseISO(day.key), 'EEEE d MMM', { locale: fr });
  if (!day.entry) return { title, lines: ['Pas de journal'] };
  const lines = ROWS.flatMap(({ kind, field }) => {
    const text = macroLine(kind, day.entry?.[field] ?? null, goalFor(day.entry, field));
    return text ? [coloredMacroLine(kind, text)] : [];
  });
  return { title, lines: lines.length > 0 ? lines : ['Pas de journal'] };
}

function averageHint(days: BreakdownDay[]): {
  title: string;
  lines: Array<string | { text: string; swatchClassName: string; textClassName: string }>;
} {
  const lines = ROWS.flatMap(({ kind, field }) => {
    const average = averageFor(days, field);
    return average != null ? [coloredMacroLine(kind, `${MACRO_LABELS[kind]} ${average} g`)] : [];
  });
  return {
    title: 'Moyenne 7 j.',
    lines: lines.length > 0 ? lines : ['Pas de journal'],
  };
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
  const [hotKey, setHotKey] = useState<HotKey>(null);
  const [hint, setHint] = useState<CursorHintState>(null);

  if (loading) {
    return (
      <section className="analysis-panel rounded-analysis-lg space-y-4 p-4">
        <div className="bg-muted h-4 w-40 animate-pulse rounded-full" />
        <div className="bg-muted h-28 animate-pulse rounded-lg" />
      </section>
    );
  }

  if (history.length === 0) return null;

  const days = breakdownDays(date, history);
  const scrubbing = hotKey != null;

  const probeDay = (day: BreakdownDay, x: number, y: number) => {
    setHotKey(day.key);
    setHint({ x, y, ...dayHint(day) });
  };
  const probeAvg = (x: number, y: number) => {
    setHotKey('avg');
    setHint({ x, y, ...averageHint(days) });
  };
  const clearProbe = () => {
    setHotKey(null);
    setHint(null);
  };

  return (
    <section className="analysis-panel rounded-analysis-lg space-y-4 p-4 sm:p-5">
      <p className="text-section-title">Évolution des macros</p>

      <div
        className="grid w-full min-w-0 items-end gap-x-1.5 gap-y-3"
        style={{
          gridTemplateColumns: '5.75rem repeat(7, minmax(0, 1fr)) 3.75rem',
        }}
        onMouseLeave={clearProbe}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            clearProbe();
          }
        }}
      >
        <div />
        {days.map((d) => (
          <span
            key={`hd-${d.key}`}
            className={cn(
              'text-muted-foreground text-center text-[10px] leading-none',
              scrubbing && hotKey === d.key && 'text-foreground',
            )}
          >
            {d.weekday}
          </span>
        ))}
        <span
          className={cn(
            'text-muted-foreground text-right text-[10px] leading-none',
            scrubbing && hotKey === 'avg' && 'text-foreground',
          )}
        >
          moy.
        </span>

        {ROWS.map(({ kind, field }) => {
          const average = averageFor(days, field);
          const scalePeak = macroRowScalePeak(days, field);
          return (
            <MacroMatrixRow
              key={kind}
              average={average}
              days={days}
              field={field}
              hotKey={hotKey}
              kind={kind}
              scalePeak={scalePeak}
              scrubbing={scrubbing}
              onProbeAvg={probeAvg}
              onProbeDay={probeDay}
            />
          );
        })}
      </div>

      <CursorFollowHint hint={hint} />
    </section>
  );
}

function MacroMatrixRow({
  kind,
  field,
  days,
  average,
  scalePeak,
  hotKey,
  scrubbing,
  onProbeDay,
  onProbeAvg,
}: {
  kind: MacroKind;
  field: 'carbohydrates' | 'fat' | 'protein';
  days: BreakdownDay[];
  average: number | null;
  scalePeak: number;
  hotKey: HotKey;
  scrubbing: boolean;
  onProbeDay: (day: BreakdownDay, x: number, y: number) => void;
  onProbeAvg: (x: number, y: number) => void;
}) {
  return (
    <>
      <div className="flex h-10 items-center gap-1.5">
        <span
          className={cn('size-1.5 shrink-0 rounded-full', MACRO_COLORS[kind].dot)}
          aria-hidden
        />
        <p className="truncate text-xs font-medium">{MACRO_LABELS[kind]}</p>
      </div>
      {days.map((d) => {
        const grams = d.entry?.[field] ?? null;
        const height = macroColumnFillPx(grams, scalePeak);
        const active = hotKey === d.key;
        return (
          <button
            key={`${kind}-${d.key}`}
            aria-label={macroDayReadout(d)}
            aria-pressed={active}
            type="button"
            className={cn(
              'bg-muted/50 flex h-10 w-full min-w-0 cursor-pointer items-end overflow-hidden rounded-[2px] border-0 p-0',
              'focus-visible:ring-primary/35 focus-visible:ring-1 focus-visible:outline-hidden',
              'transition-opacity duration-150',
              scrubbing && !active && 'opacity-40',
            )}
            onMouseEnter={(event) => onProbeDay(d, event.clientX, event.clientY)}
            onMouseMove={(event) => onProbeDay(d, event.clientX, event.clientY)}
            onFocus={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              onProbeDay(d, box.left + box.width / 2, box.top);
            }}
          >
            {height > 0 ? (
              <div
                className={cn('w-full rounded-[2px]', MACRO_COLORS[kind].bar)}
                style={{ height }}
              />
            ) : null}
          </button>
        );
      })}
      <button
        aria-pressed={hotKey === 'avg'}
        type="button"
        aria-label={
          average != null ? `Moyenne ${MACRO_LABELS[kind]} ${average} g` : 'Pas de moyenne'
        }
        className={cn(
          'text-data text-muted-foreground flex h-10 cursor-pointer items-center justify-end border-0 bg-transparent p-0 text-xs tabular-nums',
          'focus-visible:ring-primary/35 focus-visible:ring-1 focus-visible:outline-hidden',
          'transition-opacity duration-150',
          scrubbing && hotKey !== 'avg' && 'opacity-40',
        )}
        onMouseEnter={(event) => onProbeAvg(event.clientX, event.clientY)}
        onMouseMove={(event) => onProbeAvg(event.clientX, event.clientY)}
        onFocus={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onProbeAvg(box.left + box.width / 2, box.top);
        }}
      >
        {average != null ? `${average} g` : '—'}
      </button>
    </>
  );
}

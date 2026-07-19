'use client';

import Link from 'next/link';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { mapStripScoreToColorClass, mapStripStrainToColorClass } from '@/lib/today-mapping';
import { TWIN_DRILL_DOWN } from '@/lib/today-twin-navigation';
import { cn } from '@/lib/utils';

type MetricsRow = TodayViewModel['hero']['metricsRow'];

type SignalKey = 'sleep' | 'recovery' | 'adaptation' | 'effort';

type Signal = {
  key: SignalKey;
  label: string;
  href: string;
  display: string;
  valueClass: string;
  dotClass: string;
};

/** Dimension identity dots — glanceable, not judgmental. */
const DIMENSION_DOT: Record<SignalKey, string> = {
  sleep: 'bg-[var(--color-signal-base)]',
  recovery: 'bg-[var(--color-signal-recovery)]',
  adaptation: 'bg-[var(--color-signal-vo2)]',
  effort: 'bg-[var(--color-signal-threshold)]',
};

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return String(Math.round(value));
}

function formatStrain(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(1).replace('.', ',');
}

/**
 * Compact drill-down chips — no parent panel.
 * Mobile 2×2 · desktop one row.
 */
export function TodaySignalStrip({
  metricsRow,
  className,
}: {
  metricsRow: MetricsRow;
  className?: string;
}) {
  const signals: Signal[] = [
    {
      key: 'sleep',
      label: 'Sommeil',
      href: TWIN_DRILL_DOWN.sleep,
      display: formatPercent(metricsRow.sleepScore),
      valueClass: mapStripScoreToColorClass(metricsRow.sleepScore),
      dotClass: DIMENSION_DOT.sleep,
    },
    {
      key: 'recovery',
      label: 'Récup',
      href: TWIN_DRILL_DOWN.recovery,
      display: formatPercent(metricsRow.recoveryScore),
      valueClass: mapStripScoreToColorClass(metricsRow.recoveryScore),
      dotClass: DIMENSION_DOT.recovery,
    },
    {
      key: 'adaptation',
      label: 'Adapt',
      href: TWIN_DRILL_DOWN.adaptation,
      display: formatPercent(metricsRow.adaptationScore),
      valueClass: mapStripScoreToColorClass(metricsRow.adaptationScore),
      dotClass: DIMENSION_DOT.adaptation,
    },
    {
      key: 'effort',
      label: 'Effort',
      href: TWIN_DRILL_DOWN.effort,
      display: formatStrain(metricsRow.effortScore),
      valueClass: mapStripStrainToColorClass(metricsRow.effortScore),
      dotClass: DIMENSION_DOT.effort,
    },
  ];

  return (
    <nav
      aria-label="Signaux physiologiques — ouvrir le détail"
      className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}
    >
      {signals.map((signal) => (
        <Link
          key={signal.key}
          href={signal.href}
          title={`Voir le détail — ${signal.label}`}
          className={cn(
            'border-analysis-border/80 bg-background/50 hover:border-primary/35 hover:bg-muted/40',
            'focus-visible:ring-primary/35 inline-flex min-w-0 items-center justify-between gap-1.5',
            'rounded-lg border px-2.5 py-2 transition-[border-color,background-color] duration-150',
            'focus-visible:ring-2 focus-visible:outline-hidden sm:justify-start sm:py-1.5',
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', signal.dotClass)} aria-hidden />
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
              {signal.label}
            </span>
            <span className={cn('text-data text-sm tabular-nums', signal.valueClass)}>
              {signal.display}
            </span>
          </span>
          <span
            className="text-muted-foreground/70 text-data shrink-0 text-[10px] tracking-wider"
            aria-hidden
          >
            →
          </span>
        </Link>
      ))}
    </nav>
  );
}

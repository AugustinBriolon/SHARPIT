'use client';

import Link from 'next/link';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { mapStripScoreToColorClass, mapStripStrainToColorClass } from '@/lib/today/today-mapping';
import { TWIN_DRILL_DOWN, twinDimensionFromHref } from '@/lib/today/today-twin-navigation';
import { cn } from '@/lib/utils';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

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

/** Dimension identity dots — which signal, not how it reads. */
const DIMENSION_DOT: Record<SignalKey, string> = {
  sleep: 'bg-[var(--color-signal-base)]',
  recovery: 'bg-[var(--color-signal-recovery)]',
  adaptation: 'bg-[var(--color-signal-vo2)]',
  effort: 'bg-[var(--color-signal-threshold)]',
};

function formatPercent(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return String(Math.round(value));
}

function formatStrain(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return value.toFixed(1).replace('.', ',');
}

/**
 * Compact drill-down chips — no parent panel.
 * Mobile 2×2 · desktop one row.
 */
/**
 * The four dimensions, with the one holding the day back named.
 *
 * Four equal chips left the athlete to rank 78 / 68 / 54 / 5,8 himself every
 * morning — the screen had the answer and declined to give it. The limiter is
 * marked in place rather than sorted to the front: a screen read daily earns
 * spatial memory, and a strip that reorders itself spends that memory to say
 * something a tag already says.
 */
export function TodaySignalStrip({
  metricsRow,
  limiterHref = null,
  className,
  loading = false,
}: {
  metricsRow: MetricsRow;
  /** Drill-down of today's limiting dimension, when the model named one. */
  limiterHref?: string | null;
  className?: string;
  loading?: boolean;
}) {
  const limiting = loading ? null : twinDimensionFromHref(limiterHref);
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
      label: 'Récupération',
      href: TWIN_DRILL_DOWN.recovery,
      display: formatPercent(metricsRow.recoveryScore),
      valueClass: mapStripScoreToColorClass(metricsRow.recoveryScore),
      dotClass: DIMENSION_DOT.recovery,
    },
    {
      key: 'adaptation',
      label: 'Adaptation',
      href: TWIN_DRILL_DOWN.adaptation,
      display: formatPercent(metricsRow.adaptationScore),
      valueClass: mapStripScoreToColorClass(metricsRow.adaptationScore),
      dotClass: DIMENSION_DOT.adaptation,
    },
    {
      key: 'effort',
      label: 'Charge',
      href: TWIN_DRILL_DOWN.effort,
      display: formatStrain(metricsRow.effortScore),
      valueClass: mapStripStrainToColorClass(metricsRow.effortScore),
      dotClass: DIMENSION_DOT.effort,
    },
  ];

  return (
    <div className={className}>
      <nav
        aria-busy={loading || undefined}
        aria-label="Signaux physiologiques — ouvrir le détail"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {signals.map((signal) => {
          const isLimiter = limiting === signal.key;
          return (
            <Link
              key={signal.key}
              href={signal.href}
              className={cn(
                'chip-surface-lg hover:border-primary/35 group',
                'focus-visible:ring-primary/35 inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-1.5 overflow-hidden',
                'rounded-2xl px-3 py-2 transition-[border-color,background-color,transform] duration-150 ease-out',
                'focus-visible:ring-2 focus-visible:outline-hidden lg:min-h-9 lg:px-2.5 lg:py-1.5',
                isLimiter && 'border-signal-caution/45 bg-signal-caution/8',
              )}
              title={
                isLimiter
                  ? `Frein aujourd’hui — ${signal.label}`
                  : `Voir le détail — ${signal.label}`
              }
            >
              <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    isLimiter ? 'bg-signal-caution' : signal.dotClass,
                  )}
                  aria-hidden
                />
                <span className="text-muted-foreground min-w-0 truncate text-xs font-medium tracking-wide">
                  {signal.label}
                </span>
                {loading ? (
                  <SkeletonDataValue
                    className="shrink-0"
                    heightClassName="h-5"
                    widthClassName="w-7"
                  />
                ) : (
                  <span
                    className={cn('text-data shrink-0 text-sm tabular-nums', signal.valueClass)}
                  >
                    {signal.display}
                  </span>
                )}
              </span>
              {/* Named, not merely tinted: colour alone would carry the ranking. */}
              {isLimiter ? (
                <span className="text-signal-caution text-label shrink-0">Frein</span>
              ) : (
                <span
                  className="text-muted-foreground/70 text-data shrink-0 text-xs tracking-wider transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5"
                  aria-hidden
                >
                  →
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  MarkerHistoryChart,
  type MarkerHistoryPoint,
} from '@/components/today/drill-down/marker-history-chart';
import { cn } from '@/lib/utils';

export function MarkerDetailHistorySection({
  series,
  delta,
  unit,
}: {
  series: MarkerHistoryPoint[];
  delta: number | null;
  unit: string;
}) {
  if (series.length <= 1) {
    return null;
  }

  return (
    <div className="border-analysis-border/40 border-t pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label text-muted-foreground">Évolution</p>
        {delta !== null ? (
          <span className="text-data text-muted-foreground text-xs tabular-nums">
            {delta > 0 ? '+' : '−'}
            {Math.abs(Math.round(delta))} {unit} / 7 j
          </span>
        ) : null}
      </div>
      <MarkerHistoryChart className="mt-2" points={series} unit={unit} />
    </div>
  );
}

export function MarkerDetailActionLink({
  action,
}: {
  action: { label: string; href: string } | null | undefined;
}) {
  if (!action) {
    return null;
  }

  return (
    <Link
      className="text-primary hover:text-foreground border-analysis-border/40 inline-flex items-center gap-1.5 border-t pt-3 text-sm transition-colors"
      href={action.href}
    >
      {action.label}
      <span aria-hidden>→</span>
    </Link>
  );
}

export function MarkerDetailPositionLine({
  positionWord,
  concerning,
}: {
  positionWord: string | null;
  concerning: boolean;
}) {
  if (!positionWord) {
    return null;
  }

  return (
    <p
      className={cn(
        'text-sm font-medium first-letter:uppercase',
        concerning ? 'text-signal-caution' : 'text-foreground',
      )}
    >
      {positionWord}
    </p>
  );
}

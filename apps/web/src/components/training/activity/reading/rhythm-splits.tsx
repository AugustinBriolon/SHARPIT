'use client';

import { memo } from 'react';
import type { SplitRow } from '@/lib/activity/detail/activity-analysis';
import { formatPace } from '@/lib/format';
import { cn } from '@/lib/utils';
import { formatSplitDeltaAccessible, splitPaceBarPercent } from './rhythm-splits-helpers';

function paceDelta(pace: number, ref: number | null): { pct: number; faster: boolean } | null {
  if (!ref || ref <= 0) {
    return null;
  }
  const pct = ((pace - ref) / ref) * 100;
  return { pct: Math.abs(pct), faster: pct < 0 };
}

function formatSplitPace(row: SplitRow, mode: 'run' | 'bike'): string {
  if (row.paceSecPerKm === null || row.durationSec <= 0) {
    return '—';
  }
  if (mode === 'bike') {
    return `${((row.distanceM / row.durationSec) * 3.6).toFixed(1)} km/h`;
  }
  return formatPace(row.paceSecPerKm);
}

function resolveSplitDelta(
  row: SplitRow,
  refPaceSecPerKm: number | null | undefined,
  bestPace: number | null,
) {
  if (!row.paceSecPerKm) {
    return null;
  }
  return paceDelta(row.paceSecPerKm, refPaceSecPerKm ?? bestPace);
}

function isBestSplitPace(row: SplitRow, bestPace: number | null): boolean {
  return row.paceSecPerKm !== null && bestPace !== null && row.paceSecPerKm === bestPace;
}

function SplitDeltaBadge({ delta }: { delta: { pct: number; faster: boolean } }) {
  return (
    <span
      className={cn('text-[11px] font-medium', delta.faster ? 'text-primary' : 'text-signal-vo2')}
    >
      <span aria-hidden>
        {delta.faster ? '−' : '+'}
        {delta.pct.toFixed(0)}%
      </span>
      <span className="sr-only">{formatSplitDeltaAccessible(delta)}</span>
    </span>
  );
}

function formatBikeSecondary(row: SplitRow): string {
  if (row.avgWatts === null) {
    return '—';
  }
  return `${Math.round(row.avgWatts)} W`;
}

function formatRunSecondary(row: SplitRow): string {
  if (row.elevationGainM === null) {
    return '—';
  }
  return `+${row.elevationGainM} m`;
}

function SplitSecondaryMetrics({ row, mode }: { row: SplitRow; mode: 'run' | 'bike' }) {
  const hr = row.avgHr !== null ? `${Math.round(row.avgHr)} bpm` : '—';
  const secondary = mode === 'bike' ? formatBikeSecondary(row) : formatRunSecondary(row);

  return (
    <div className="text-data text-muted-foreground space-y-0.5 text-right text-[11px] tabular-nums">
      <p>{hr}</p>
      <p>{secondary}</p>
    </div>
  );
}

function RhythmSplitRow({
  row,
  mode,
  refPaceSecPerKm,
  bestPace,
  minPace,
  maxPace,
}: {
  row: SplitRow;
  mode: 'run' | 'bike';
  refPaceSecPerKm?: number | null;
  bestPace: number | null;
  minPace: number | null;
  maxPace: number | null;
}) {
  const delta = resolveSplitDelta(row, refPaceSecPerKm, bestPace);
  const isBest = isBestSplitPace(row, bestPace);
  const bar = splitPaceBarPercent(row.paceSecPerKm, minPace, maxPace);
  const showDelta = Boolean(delta && refPaceSecPerKm && mode === 'run');

  return (
    <li className="activity-log-split-row grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 py-2">
      <span className="text-data text-muted-foreground text-xs tabular-nums">{row.label}</span>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              'text-data text-sm font-semibold tabular-nums',
              isBest && mode === 'run' && 'text-primary',
            )}
          >
            {formatSplitPace(row, mode)}
          </span>
          {showDelta && delta ? <SplitDeltaBadge delta={delta} /> : null}
        </div>
        <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full" aria-hidden>
          <div
            className={cn('h-full rounded-full', isBest ? 'bg-primary' : 'bg-foreground/55')}
            style={{ width: `${bar}%` }}
          />
        </div>
      </div>
      <SplitSecondaryMetrics mode={mode} row={row} />
    </li>
  );
}

function RhythmSplitsComponent({
  splits,
  refPaceSecPerKm,
  title,
  mode = 'run',
}: {
  splits: SplitRow[];
  refPaceSecPerKm?: number | null;
  title: string;
  mode?: 'run' | 'bike';
}) {
  if (!splits.length) {
    return null;
  }

  const paces = splits.map((s) => s.paceSecPerKm).filter((p): p is number => p !== null);
  const bestPace = paces.length ? Math.min(...paces) : null;
  const minPace = paces.length ? Math.min(...paces) : null;
  const maxPace = paces.length ? Math.max(...paces) : null;

  return (
    <section className="activity-log-rhythm overflow-hidden">
      <div className="activity-log-rhythm-head px-1 pb-3">
        <h2 className="text-section-title">{title}</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Rythme relatif — barres plus longues = allure plus vive
        </p>
      </div>
      <ul className="space-y-1 px-1">
        {splits.map((row) => (
          <RhythmSplitRow
            key={row.index}
            bestPace={bestPace}
            maxPace={maxPace}
            minPace={minPace}
            mode={mode}
            refPaceSecPerKm={refPaceSecPerKm}
            row={row}
          />
        ))}
      </ul>
    </section>
  );
}

export const RhythmSplits = memo(RhythmSplitsComponent);

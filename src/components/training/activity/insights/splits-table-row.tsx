'use client';

import type { SplitRow } from '@/lib/activity/detail/activity-analysis';
import { cn } from '@/lib/utils';
import { formatPace } from '@/lib/format';

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

function PaceDeltaBadge({ delta }: { delta: { pct: number; faster: boolean } }) {
  return (
    <span className={cn('ml-1 text-[10px]', delta.faster ? 'text-primary' : 'text-signal-vo2')}>
      {delta.faster ? '−' : '+'}
      {delta.pct.toFixed(0)}%
    </span>
  );
}

function isBestSplitPace(row: SplitRow, bestPace: number | null): boolean {
  return row.paceSecPerKm !== null && bestPace !== null && row.paceSecPerKm === bestPace;
}

function SplitPaceCell({
  row,
  mode,
  refPaceSecPerKm,
  bestPace,
}: {
  row: SplitRow;
  mode: 'run' | 'bike';
  refPaceSecPerKm?: number | null;
  bestPace: number | null;
}) {
  const delta = row.paceSecPerKm ? paceDelta(row.paceSecPerKm, refPaceSecPerKm ?? bestPace) : null;
  const isBest = isBestSplitPace(row, bestPace);
  const showDelta = Boolean(delta && refPaceSecPerKm && mode === 'run');

  return (
    <td className={cn('py-2 pr-4 font-mono', isBest && mode === 'run' && 'text-primary')}>
      {formatSplitPace(row, mode)}
      {showDelta ? <PaceDeltaBadge delta={delta!} /> : null}
    </td>
  );
}

export function SplitTableRow({
  row,
  mode,
  refPaceSecPerKm,
  bestPace,
}: {
  row: SplitRow;
  mode: 'run' | 'bike';
  refPaceSecPerKm?: number | null;
  bestPace: number | null;
}) {
  return (
    <tr className="border-analysis-border/30 border-b last:border-0">
      <td className="text-muted-foreground py-2 pr-4 pl-4 font-mono">{row.label}</td>
      <SplitPaceCell bestPace={bestPace} mode={mode} refPaceSecPerKm={refPaceSecPerKm} row={row} />
      <td className="py-2 pr-4 font-mono">
        {row.avgHr !== null ? `${Math.round(row.avgHr)}` : '—'}
      </td>
      {mode === 'bike' ? (
        <td className="py-2 pr-4 font-mono">
          {row.avgWatts !== null ? `${Math.round(row.avgWatts)} W` : '—'}
        </td>
      ) : null}
      <td className="text-muted-foreground py-2 font-mono">
        {row.elevationGainM !== null ? `+${row.elevationGainM} m` : '—'}
      </td>
    </tr>
  );
}

'use client';

import { memo } from 'react';
import type { SplitRow } from '@/lib/activity-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDuration, formatPace } from '@/lib/format';
import { cn } from '@/lib/utils';

function paceDelta(pace: number, ref: number | null): { pct: number; faster: boolean } | null {
  if (!ref || ref <= 0) return null;
  const pct = ((pace - ref) / ref) * 100;
  return { pct: Math.abs(pct), faster: pct < 0 };
}

function formatSplitPace(row: SplitRow, mode: 'run' | 'bike'): string {
  if (row.paceSecPerKm == null || row.durationSec <= 0) return '—';
  if (mode === 'bike') {
    return `${((row.distanceM / row.durationSec) * 3.6).toFixed(1)} km/h`;
  }
  return formatPace(row.paceSecPerKm);
}

function SplitsTableComponent({
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
  if (!splits.length) return null;

  const paces = splits.map((s) => s.paceSecPerKm).filter((p): p is number => p != null);
  const bestPace = paces.length ? Math.min(...paces) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-border/60 text-muted-foreground border-b text-left text-xs tracking-wider uppercase">
              <th className="pr-4 pb-2 font-medium">Split</th>
              <th className="pr-4 pb-2 font-medium">Temps</th>
              <th className="pr-4 pb-2 font-medium">{mode === 'bike' ? 'Vitesse' : 'Allure'}</th>
              <th className="pr-4 pb-2 font-medium">FC</th>
              {mode === 'bike' && <th className="pr-4 pb-2 font-medium">W moy.</th>}
              <th className="pb-2 font-medium">D+</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((row) => {
              const delta = row.paceSecPerKm
                ? paceDelta(row.paceSecPerKm, refPaceSecPerKm ?? bestPace)
                : null;
              const isBest =
                row.paceSecPerKm != null && bestPace != null && row.paceSecPerKm === bestPace;

              return (
                <tr key={row.index} className="border-border/30 border-b last:border-0">
                  <td className="text-muted-foreground py-2 pr-4 font-mono">{row.label}</td>
                  <td className="py-2 pr-4 font-mono">{formatDuration(row.durationSec)}</td>
                  <td
                    className={cn(
                      'py-2 pr-4 font-mono',
                      isBest && mode === 'run' && 'text-cyan-600',
                    )}
                  >
                    {formatSplitPace(row, mode)}
                    {delta && refPaceSecPerKm && mode === 'run' && (
                      <span
                        className={cn(
                          'ml-1 text-[10px]',
                          delta.faster ? 'text-emerald-600' : 'text-orange-600',
                        )}
                      >
                        {delta.faster ? '−' : '+'}
                        {delta.pct.toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-mono">
                    {row.avgHr != null ? `${Math.round(row.avgHr)}` : '—'}
                  </td>
                  {mode === 'bike' && (
                    <td className="py-2 pr-4 font-mono">
                      {row.avgWatts != null ? `${Math.round(row.avgWatts)} W` : '—'}
                    </td>
                  )}
                  <td className="text-muted-foreground py-2 font-mono">
                    {row.elevationGainM != null ? `+${row.elevationGainM} m` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export const SplitsTable = memo(SplitsTableComponent);

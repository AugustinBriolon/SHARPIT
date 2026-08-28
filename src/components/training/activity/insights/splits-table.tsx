'use client';

import { memo } from 'react';
import type { SplitRow } from '@/lib/activity/detail/activity-analysis';
import { SplitTableRow } from '@/components/training/activity/insights/splits-table-row';

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
  if (!splits.length) {
    return null;
  }

  const paces = splits.map((s) => s.paceSecPerKm).filter((p): p is number => p !== null);
  const bestPace = paces.length ? Math.min(...paces) : null;

  return (
    <section className="analysis-panel rounded-analysis-lg overflow-hidden">
      <div className="border-analysis-border/60 border-b px-4 py-3 sm:px-5">
        <h2 className="text-label">{title}</h2>
        <p className="text-muted-foreground mt-1 text-xs">Lecture séquentielle split par split</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] px-3 text-sm">
          <thead>
            <tr className="border-analysis-border/60 text-muted-foreground border-b px-4 text-left text-[10px] tracking-[0.08em] uppercase">
              <th className="py-2.5 pr-4 pl-4 font-medium">Split</th>
              <th className="py-2.5 pr-4 font-medium">{mode === 'bike' ? 'Vitesse' : 'Allure'}</th>
              <th className="py-2.5 pr-4 font-medium">FC</th>
              {mode === 'bike' ? <th className="py-2.5 pr-4 font-medium">W moy.</th> : null}
              <th className="py-2.5 pr-4 font-medium">D+</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((row) => (
              <SplitTableRow
                key={row.index}
                bestPace={bestPace}
                mode={mode}
                refPaceSecPerKm={refPaceSecPerKm}
                row={row}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const SplitsTable = memo(SplitsTableComponent);

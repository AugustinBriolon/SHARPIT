'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { AxisTick } from '@/lib/health/journal-habit-axis';
import type { DumbbellRowModel } from '@/lib/health/journal-analyses-view-model';
import { cn } from '@/lib/utils';
import { DistributionStrips } from './distribution-strips';
import {
  DUMBBELL_DELTA_CELL,
  DUMBBELL_GRID,
  DUMBBELL_LABEL_CELL,
  DUMBBELL_TRACK_CELL,
} from './dumbbell-grid';
import { DumbbellTrack } from './dumbbell-track';
import { FactorIcon } from './factor-icon';

/** Habit name, with the measurement shift as its only sub-label. */
function DumbbellRowLabel({ row }: { row: DumbbellRowModel }) {
  return (
    <span className={cn(DUMBBELL_LABEL_CELL, 'flex items-center gap-3')}>
      <FactorIcon factorId={row.factorId} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{row.label}</span>
          {row.tested ? (
            <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-1.5 text-xs">
              testé
            </span>
          ) : null}
        </span>
        {row.lagLabel ? (
          <span className="text-muted-foreground text-data block text-xs">{row.lagLabel}</span>
        ) : null}
      </span>
    </span>
  );
}

export function DumbbellRow({
  row,
  ticks,
  actions,
}: {
  row: DumbbellRowModel;
  ticks: readonly AxisTick[];
  actions: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();

  return (
    <li>
      <button
        aria-controls={detailId}
        aria-expanded={open}
        type="button"
        className={cn(
          DUMBBELL_GRID,
          'focus-visible:ring-ring/50 min-h-11 w-full rounded-md py-2.5 text-start outline-none focus-visible:ring-2',
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <DumbbellRowLabel row={row} />
        <span className={DUMBBELL_TRACK_CELL}>
          <DumbbellTrack
            ariaLabel={row.ariaLabel}
            polarity={row.polarity}
            ticks={ticks}
            weak={row.weak}
            withHabit={row.withHabit}
            without={row.without}
          />
        </span>
        <span className={cn(DUMBBELL_DELTA_CELL, 'flex items-center gap-1.5')}>
          <span className="text-data text-sm">{row.deltaLabel}</span>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-3.5 transition-transform duration-150 motion-reduce:transition-none',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </span>
      </button>
      <DistributionStrips actions={actions} id={detailId} open={open} row={row} ticks={ticks} />
    </li>
  );
}

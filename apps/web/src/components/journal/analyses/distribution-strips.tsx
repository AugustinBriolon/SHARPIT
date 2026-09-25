'use client';

import type { ReactNode } from 'react';
import { MotionExpand } from '@/components/motion';
import type { AxisPosition, AxisTick } from '@/lib/journal/journal-habit-axis';
import type { DumbbellRowModel } from '@/lib/journal/journal-analyses-view-model';
import { cn } from '@/lib/utils';
import {
  DUMBBELL_DELTA_CELL,
  DUMBBELL_GRID,
  DUMBBELL_LABEL_CELL,
  DUMBBELL_TRACK_BOX,
  DUMBBELL_TRACK_CELL,
} from './dumbbell-grid';
import { AxisPoint, TickGuides } from './dumbbell-track';

function StripTrack({
  days,
  median,
  ticks,
  variant,
}: {
  days: readonly AxisPosition[];
  median: AxisPosition;
  ticks: readonly AxisTick[];
  variant: 'with' | 'without';
}) {
  return (
    <span
      className={cn(
        DUMBBELL_TRACK_BOX,
        'h-5',
        variant === 'without' ? 'bg-muted/25' : 'bg-foreground/[0.04]',
      )}
      aria-hidden
    >
      <TickGuides ticks={ticks} />
      <span className="bg-analysis-border absolute inset-x-0 top-1/2 h-px" />
      {days.map((day, index) => (
        <AxisPoint key={index} position={day} variant={variant} small />
      ))}
      <span
        className="bg-foreground absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${median.pct}%` }}
      />
    </span>
  );
}

function Strip({
  label,
  medianLabel,
  days,
  median,
  count,
  ticks,
  variant,
}: {
  label: string;
  medianLabel: string;
  days: readonly AxisPosition[];
  median: AxisPosition;
  count: number;
  ticks: readonly AxisTick[];
  variant: 'with' | 'without';
}) {
  return (
    <div className={DUMBBELL_GRID}>
      <span className={cn(DUMBBELL_LABEL_CELL, 'text-muted-foreground ps-11 text-xs')}>
        <span className="block leading-tight">{label}</span>
        <span className="text-data text-foreground/80 mt-0.5 block tabular-nums">
          {medianLabel}
        </span>
      </span>
      <span className={DUMBBELL_TRACK_CELL}>
        <StripTrack days={days} median={median} ticks={ticks} variant={variant} />
      </span>
      <span className={cn(DUMBBELL_DELTA_CELL, 'text-muted-foreground text-data text-xs')}>
        {count} j
      </span>
    </div>
  );
}

/** Second level of a dumbbell: the real days behind both medians, on the same axis. */
export function DistributionStrips({
  id,
  open,
  row,
  ticks,
  actions,
}: {
  id: string;
  open: boolean;
  row: DumbbellRowModel;
  ticks: readonly AxisTick[];
  actions: ReactNode;
}) {
  return (
    <MotionExpand id={id} open={open}>
      <div className="space-y-3 pt-1 pb-4">
        <div aria-hidden={!open} className="space-y-1.5">
          {/* Baseline first: sans → avec reads as the comparison narrative. */}
          <Strip
            count={row.nNo}
            days={row.withoutDays}
            label="Sans l’habitude"
            median={row.without}
            medianLabel={row.withoutLabel}
            ticks={ticks}
            variant="without"
          />
          <Strip
            count={row.nYes}
            days={row.withDays}
            label="Avec l’habitude"
            median={row.withHabit}
            medianLabel={row.withLabel}
            ticks={ticks}
            variant="with"
          />
        </div>
        <div className={DUMBBELL_GRID}>
          <div className={cn(DUMBBELL_TRACK_CELL, 'space-y-2')}>
            <p className="text-sm text-pretty">{row.overlapSentence}</p>
            <p className="text-muted-foreground text-data text-xs">{row.mediansLabel}</p>
            {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
          </div>
        </div>
      </div>
    </MotionExpand>
  );
}

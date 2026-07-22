'use client';

import { useMemo } from 'react';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { useIsMobile } from '@/hooks/use-viewport';
import {
  buildActivityConsistencyStats,
  formatHeatmapRangeLabel,
  HEATMAP_DAYS_MOBILE,
  HEATMAP_LEVEL_CLASS,
  type ActivityConsistencyStats,
  type HeatmapCell,
} from '@/lib/activity/activity-consistency';
import type { ClientActivity } from '@/lib/query/types';
import { cn } from '@/lib/utils';

function formatCellTitle(cell: HeatmapCell): string {
  const [y, m, d] = cell.date.split('-');
  if (cell.count === 0) return `${d}/${m}/${y} · repos`;
  const load = cell.load > 0 ? ` · ${cell.load} TSS` : '';
  const sessions = cell.count === 1 ? '1 séance' : `${cell.count} séances`;
  return `${d}/${m}/${y} · ${sessions}${load}`;
}

/** Instrument reading — consecutive weeks with load, not a streak game. */
function ConsistencyReading({ stats }: { stats: ActivityConsistencyStats }) {
  const { currentStreak, activeThisWeek } = stats;

  if (currentStreak === 0) {
    return (
      <p className="text-muted-foreground text-data text-xs">Aucune semaine avec charge récente</p>
    );
  }

  return (
    <p className="text-data text-xs">
      <span className="text-foreground font-semibold tabular-nums">{currentStreak}</span>
      <span className="text-muted-foreground">
        {' '}
        sem. avec charge
        {!activeThisWeek ? ' · semaine en cours encore ouverte' : ''}
      </span>
    </p>
  );
}

function HeatmapGrid({ weekColumns }: { weekColumns: HeatmapCell[][] }) {
  return (
    <div className="flex w-full items-start gap-[2px]">
      {weekColumns.map((column, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[2px]">
          {column.map((cell) => (
            <div
              key={cell.date}
              title={cell.inRange ? formatCellTitle(cell) : undefined}
              className={cn(
                'aspect-square min-h-[6px] w-full rounded-[2px]',
                cell.inRange ? HEATMAP_LEVEL_CLASS[cell.level] : 'bg-transparent',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ActivityConsistencyPanel({
  activities,
  className,
  loading = false,
}: {
  activities: ClientActivity[];
  className?: string;
  loading?: boolean;
}) {
  const isMobile = useIsMobile();
  const stats = useMemo(
    () =>
      buildActivityConsistencyStats(activities, undefined, {
        heatmapDays: isMobile ? HEATMAP_DAYS_MOBILE : undefined,
      }),
    [activities, isMobile],
  );

  const rangeLabel = formatHeatmapRangeLabel(stats.heatmapDays);

  return (
    <div
      className={cn(
        'analysis-panel rounded-analysis-lg flex h-full w-full flex-col px-4 py-4 sm:px-5 sm:py-5',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <EyebrowLabel variant="dashboard">Régularité</EyebrowLabel>
          {loading ? (
            <div className="mt-1.5">
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-40" />
            </div>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {stats.trailingYearActivityCount} séance
              {stats.trailingYearActivityCount > 1 ? 's' : ''} sur {rangeLabel}
              {' · '}
              {stats.activeDays} {stats.activeDays > 1 ? 'jours actifs' : 'jour actif'} sur{' '}
              {stats.heatmapDays}
            </p>
          )}
        </div>
        {loading ? (
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-28" />
        ) : (
          <ConsistencyReading stats={stats} />
        )}
      </div>

      {loading ? (
        <div className="flex w-full items-start gap-[2px]" aria-hidden>
          {Array.from({ length: 12 }, (_, colIdx) => (
            <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[2px]">
              {Array.from({ length: 7 }, (_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="bg-muted/60 aspect-square min-h-[6px] w-full animate-pulse rounded-[2px]"
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <HeatmapGrid weekColumns={stats.weekColumns} />
      )}

      <div className="mt-3 flex items-center justify-end gap-3 border-t pt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[10px]">Moins</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className={cn('size-2.5 rounded-[2px] sm:size-[9px]', HEATMAP_LEVEL_CLASS[level])}
            />
          ))}
          <span className="text-muted-foreground text-[10px]">Plus</span>
        </div>
      </div>
    </div>
  );
}

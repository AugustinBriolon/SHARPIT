'use client';

import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { useIsMobile } from '@/hooks/use-viewport';
import {
  buildActivityConsistencyStats,
  formatHeatmapRangeLabel,
  HEATMAP_DAYS_MOBILE,
  HEATMAP_LEVEL_CLASS,
  type ActivityConsistencyStats,
  type HeatmapCell,
} from '@/lib/activity-consistency';
import type { ClientActivity } from '@/lib/query/types';
import { cn } from '@/lib/utils';

function formatCellTitle(cell: HeatmapCell): string {
  const [y, m, d] = cell.date.split('-');
  if (cell.count === 0) return `${d}/${m}/${y} · repos`;
  const load = cell.load > 0 ? ` · ${cell.load} TSS` : '';
  const sessions = cell.count === 1 ? '1 séance' : `${cell.count} séances`;
  return `${d}/${m}/${y} · ${sessions}${load}`;
}

function StreakBadge({ stats }: { stats: ActivityConsistencyStats }) {
  const { currentStreak, activeThisWeek } = stats;

  if (currentStreak === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Flame className="size-3.5 opacity-40" aria-hidden />
        <span>Aucune série en cours</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Flame
        className={cn('size-4', activeThisWeek ? 'text-orange-500' : 'text-orange-400/70')}
        aria-hidden
      />
      <span className="text-sm font-semibold text-orange-600 tabular-nums dark:text-orange-400">
        {currentStreak}
      </span>
      <span className="text-muted-foreground text-xs">
        sem.{currentStreak > 1 ? 's' : ''}
        {!activeThisWeek && ' · séance à prévoir cette semaine'}
      </span>
    </div>
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
}: {
  activities: ClientActivity[];
  className?: string;
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
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {stats.trailingYearActivityCount} séance
            {stats.trailingYearActivityCount > 1 ? 's' : ''} sur {rangeLabel}
            {' · '}
            {stats.activeDays} {stats.activeDays > 1 ? 'jours actifs' : 'jour actif'} sur{' '}
            {stats.heatmapDays}
          </p>
        </div>
        <StreakBadge stats={stats} />
      </div>

      <HeatmapGrid weekColumns={stats.weekColumns} />

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

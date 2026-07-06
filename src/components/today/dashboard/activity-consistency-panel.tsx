'use client';

import { Flame } from 'lucide-react';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import {
  buildActivityConsistencyStats,
  HEATMAP_LEVEL_CLASS,
  type ActivityConsistencyStats,
  type HeatmapCell,
} from '@/lib/activity-consistency';
import type { ClientActivity } from '@/lib/query/types';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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

export function ActivityConsistencyPanel({
  activities,
  className,
}: {
  activities: ClientActivity[];
  className?: string;
}) {
  const stats = buildActivityConsistencyStats(activities);

  return (
    <div
      className={cn(
        'bg-card flex flex-col rounded-2xl border px-4 py-4 sm:px-5 sm:py-5',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <EyebrowLabel variant="dashboard">Régularité</EyebrowLabel>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {stats.trailingYearActivityCount} séance
            {stats.trailingYearActivityCount > 1 ? 's' : ''} sur 12 mois
            {' · '}
            {stats.activeDays} {stats.activeDays > 1 ? 'jours actifs' : 'jour actif'} sur 12 mois
          </p>
        </div>
        <StreakBadge stats={stats} />
      </div>

      <div className="max-w-full overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
        <div className="inline-flex w-max gap-[2px] min-[1200px]:gap-[3px]">
          {stats.weekColumns.map((column, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-[2px] min-[1200px]:gap-[3px]">
              {column.map((cell) => (
                <div
                  key={cell.date}
                  title={cell.inRange ? formatCellTitle(cell) : undefined}
                  className={cn(
                    'size-[8px] rounded-[2px] min-[1200px]:size-[10px] sm:size-[9px]',
                    cell.inRange ? HEATMAP_LEVEL_CLASS[cell.level] : 'bg-transparent',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <div className="text-muted-foreground hidden gap-1 sm:flex">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="w-[8px] text-center text-[9px] min-[1200px]:w-[10px] sm:w-[9px]"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-muted-foreground text-[10px]">Moins</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className={cn(
                'size-[8px] rounded-[2px] min-[1200px]:size-[10px] sm:size-[9px]',
                HEATMAP_LEVEL_CLASS[level],
              )}
            />
          ))}
          <span className="text-muted-foreground text-[10px]">Plus</span>
        </div>
      </div>
    </div>
  );
}

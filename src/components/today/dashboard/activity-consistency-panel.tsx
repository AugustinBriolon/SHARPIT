'use client';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { useIsMobile } from '@/hooks/use-viewport';
import {
  type ActivityForConsistency,
  buildActivityConsistencyStats,
  formatHeatmapRangeLabel,
  HEATMAP_DAYS_MOBILE,
  HEATMAP_LEVEL_CLASS,
  type ActivityConsistencyStats,
  type HeatmapCell,
} from '@/lib/activity/activity-consistency';
import { cn } from '@/lib/utils';

function formatCellTitle(cell: HeatmapCell): string {
  const [y, m, d] = cell.date.split('-');
  if (cell.count === 0) return `${d}/${m}/${y} · repos`;
  const load = cell.load > 0 ? ` · ${cell.load} TSS` : '';
  const sessions = cell.count === 1 ? '1 séance' : `${cell.count} séances`;
  return `${d}/${m}/${y} · ${sessions}${load}`;
}

function formatCellDateLabel(cell: HeatmapCell): string {
  return format(parseISO(cell.date), 'EEEE d MMMM yyyy', { locale: fr });
}

function formatCellSessionsLabel(cell: HeatmapCell): string {
  if (cell.count === 0) return 'Repos';
  return cell.count === 1 ? '1 séance' : `${cell.count} séances`;
}

function formatCellLoadLabel(cell: HeatmapCell): string | null {
  if (cell.count === 0 || cell.load <= 0) return null;
  return `${cell.load} TSS`;
}

/** Instrument reading — consecutive weeks with load, not a streak game. */
function CurrentStreakSignal({ stats }: { stats: ActivityConsistencyStats }) {
  const { currentStreak, activeThisWeek } = stats;

  if (currentStreak === 0) {
    return (
      <div className="analysis-panel-alt rounded-analysis px-3 py-2.5 sm:min-w-[11rem]">
        <p className="text-label">Série en cours</p>
        <p className="text-muted-foreground mt-1 text-xs">Aucune semaine avec charge récente</p>
      </div>
    );
  }

  return (
    <div className="analysis-panel-alt rounded-analysis px-3 py-2.5 sm:min-w-[11rem]">
      <p className="text-label">Série en cours</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-foreground text-instrument text-lg font-semibold tabular-nums">
          {currentStreak}
        </p>
        <p className="text-muted-foreground pb-0.5 text-xs">sem. avec charge</p>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {activeThisWeek ? 'Semaine active' : 'Semaine en cours encore ouverte'}
      </p>
    </div>
  );
}

function HeatmapCellBlock({
  cell,
  tooltipAlign = 'center',
}: {
  cell: HeatmapCell;
  tooltipAlign?: 'center' | 'left' | 'right';
}) {
  const tooltipTitle = formatCellTitle(cell);
  const dateLabel = formatCellDateLabel(cell);
  const sessionsLabel = formatCellSessionsLabel(cell);
  const loadLabel = formatCellLoadLabel(cell);

  return (
    <div
      aria-label={tooltipTitle}
      role="img"
      title={cell.inRange ? tooltipTitle : undefined}
      className={cn(
        'group/cell relative aspect-square min-h-[6px] w-full',
        !cell.inRange && 'pointer-events-none',
      )}
    >
      <div
        className={cn(
          'h-full w-full rounded-[2px] transition-transform duration-150 group-hover/cell:scale-[1.08]',
          cell.inRange ? HEATMAP_LEVEL_CLASS[cell.level] : 'bg-transparent',
        )}
      />
      {cell.inRange ? (
        <div
          className={cn(
            'pointer-events-none absolute top-[calc(100%+0.45rem)] z-20 hidden w-max min-w-[9rem] opacity-0 transition-opacity duration-150 group-hover/cell:opacity-100 lg:block',
            tooltipAlign === 'center' && 'left-1/2 -translate-x-1/2',
            tooltipAlign === 'left' && 'left-0',
            tooltipAlign === 'right' && 'right-0',
          )}
        >
          <div className="analysis-panel rounded-analysis px-3 py-2 text-xs shadow-none">
            <p className="text-label">{dateLabel}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-foreground text-data font-semibold tabular-nums">
                {sessionsLabel}
              </p>
              {loadLabel ? <p className="text-muted-foreground text-[11px]">{loadLabel}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeatmapGrid({
  weekColumns,
  activeThisWeek,
}: {
  weekColumns: HeatmapCell[][];
  activeThisWeek: boolean;
}) {
  const currentWeekIndex = weekColumns.length - 1;

  return (
    <div className="flex w-full items-start gap-[2px]">
      {weekColumns.map((column, colIdx) => {
        let tooltipAlign: 'center' | 'left' | 'right' = 'center';
        if (colIdx <= 1) tooltipAlign = 'left';
        else if (colIdx >= weekColumns.length - 2) tooltipAlign = 'right';

        return (
          <div
            key={colIdx}
            className={cn(
              'flex min-w-0 flex-1 flex-col gap-[2px] rounded-[4px] p-[1px]',
              colIdx === currentWeekIndex &&
                (activeThisWeek
                  ? 'bg-primary/8 ring-primary/25 ring-1'
                  : 'bg-analysis-surface-alt/60 ring-analysis-border ring-1'),
            )}
          >
            {column.map((cell) => (
              <HeatmapCellBlock key={cell.date} cell={cell} tooltipAlign={tooltipAlign} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function ActivityConsistencyPanel({
  activities,
  className,
  loading = false,
}: {
  activities: ActivityForConsistency[];
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
          <CurrentStreakSignal stats={stats} />
        )}
      </div>

      {loading ? (
        <div className="flex w-full items-start gap-[2px]" aria-hidden>
          {stats.weekColumns.map((column, colIdx) => (
            <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-[2px]">
              {column.map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="bg-muted/60 aspect-square min-h-[6px] w-full animate-pulse rounded-[2px]"
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <HeatmapGrid activeThisWeek={stats.activeThisWeek} weekColumns={stats.weekColumns} />
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

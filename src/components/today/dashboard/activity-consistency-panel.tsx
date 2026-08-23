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
  type HeatmapCell,
} from '@/lib/activity/list/activity-consistency';
import { cn } from '@/lib/utils';

/** Fixed anchor for prerender-safe loading heatmap layout. */
const LOADING_ANCHOR = new Date('2026-01-01T12:00:00');

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

/**
 * A reading, sized like one.
 *
 * The streak and the density were a grey sentence at 11 px while the headline
 * was the word "Régularité". These are the two figures an athlete comes here
 * for — whether the habit is alive, and how dense it is — so they get the room
 * and the mono face every other instrument in the app uses.
 */
function Reading({
  value,
  unit,
  caption,
  emphasis = false,
}: {
  value: string;
  unit: string;
  caption: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-data text-2xl font-semibold tabular-nums',
            emphasis ? 'text-primary' : 'text-foreground',
          )}
        >
          {value}
        </span>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </p>
      <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{caption}</p>
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
      buildActivityConsistencyStats(activities, loading ? LOADING_ANCHOR : new Date(), {
        heatmapDays: isMobile ? HEATMAP_DAYS_MOBILE : undefined,
      }),
    [activities, isMobile, loading],
  );

  const rangeLabel = formatHeatmapRangeLabel(stats.heatmapDays);

  return (
    <div
      className={cn(
        'analysis-panel rounded-analysis-lg flex h-full w-full flex-col px-4 py-4 sm:px-5 sm:py-5',
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <EyebrowLabel variant="dashboard">Régularité</EyebrowLabel>
        <p className="text-data text-muted-foreground text-[11px]">{rangeLabel}</p>
      </div>

      {loading ? (
        <div className="mb-4 flex gap-6">
          <SkeletonDataValue heightClassName="h-7" widthClassName="w-16" />
          <SkeletonDataValue heightClassName="h-7" widthClassName="w-20" />
        </div>
      ) : (
        <div className="mb-4 flex gap-6">
          {/* Emphasised because it is the one with a decision behind it: a streak
              is kept alive or it is not, and today is when that is decided. */}
          <Reading
            emphasis={stats.currentStreak > 0}
            unit={stats.currentStreak > 1 ? 'semaines' : 'semaine'}
            value={stats.currentStreak > 0 ? String(stats.currentStreak) : '—'}
            caption={
              stats.activeThisWeek
                ? 'de suite, celle-ci comprise'
                : 'de suite, celle-ci encore ouverte'
            }
          />
          <span className="bg-analysis-border/60 w-px self-stretch" aria-hidden />
          <Reading
            caption={`${stats.trailingYearActivityCount} séances enregistrées`}
            unit={`/ ${stats.heatmapDays} jours`}
            value={String(stats.activeDays)}
          />
        </div>
      )}

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

      {/* Inline rather than a row of its own: a scale explaining a gradient the
          grid already shows does not deserve a border and its own band. */}
      <div className="mt-2.5 flex items-center justify-end gap-1.5">
        <span className="text-muted-foreground text-[10px]">Moins</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <div
            key={level}
            className={cn('size-2 rounded-[2px]', HEATMAP_LEVEL_CLASS[level])}
            aria-hidden
          />
        ))}
        <span className="text-muted-foreground text-[10px]">Plus</span>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import type { ActivityType } from '@prisma/client';
import { MemoizedRouteMap as RouteMap } from '@/components/training/activity/insights/route-map';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityStream } from '@/hooks/use-data';
import { SPORT_IDENTITY_HEX, SPORT_IDENTITY_PANEL } from '@/lib/activity/sport-identity';
import { cn } from '@/lib/utils';
import {
  activityMayHaveRoutePath,
  completedPreviewDetailsClass,
  completedPreviewFadeClass,
  completedPreviewGridClass,
  completedPreviewTitleClass,
  resolveCompletedSessionMapSlot,
  resolveUsableRoutePath,
  selectCompletedPreviewMetrics,
  type CompletedSessionPreviewLayout,
} from '@/components/today/rich/completed-session-preview-helpers';

export type CompletedSessionPreviewMetric = {
  label: string;
  value: string;
  unit: string;
};

function PreviewMetrics({
  metrics,
  compact,
}: {
  metrics: CompletedSessionPreviewMetric[];
  compact: boolean;
}) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <dl
      className={cn(
        'grid w-full',
        compact ? 'gap-1.5' : 'gap-3',
        metrics.length >= 3 && 'grid-cols-3',
        metrics.length === 2 && 'grid-cols-2',
        metrics.length === 1 && 'grid-cols-1',
      )}
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <dt className="text-label text-muted-foreground">{metric.label}</dt>
          <dd
            className={cn(
              'text-data text-foreground mt-1 font-semibold tabular-nums',
              compact ? 'flex flex-col gap-0.5' : 'flex items-baseline gap-1',
            )}
          >
            <span
              className={cn(
                'leading-none',
                compact ? 'text-base' : 'text-[clamp(1.125rem,3.6vw,1.5rem)]',
              )}
            >
              {metric.value}
            </span>
            {metric.unit ? (
              <span className="text-muted-foreground text-xs font-medium">{metric.unit}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function NoMapBand({
  activityType,
  title,
  layout,
}: {
  activityType: ActivityType;
  title: string;
  layout: CompletedSessionPreviewLayout;
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-end gap-2',
        layout === 'split' && 'h-full min-h-28 border-r px-3 py-3',
        layout === 'stack' && 'h-32 border-b',
        layout === 'column' && 'min-h-30 border-b px-4 py-4 sm:min-h-0 sm:border-r sm:border-b-0',
        SPORT_IDENTITY_PANEL[activityType],
      )}
    >
      {layout === 'stack' ? null : (
        <>
          <ActivityTypeIndicator type={activityType} />
          <p className={completedPreviewTitleClass(layout)}>{title}</p>
        </>
      )}
    </div>
  );
}

function MapBand({
  activityId,
  activityType,
  path,
  layout,
}: {
  activityId: string;
  activityType: ActivityType;
  path: [number, number][] | null;
  layout: CompletedSessionPreviewLayout;
}) {
  return (
    <div
      aria-busy={!path || undefined}
      className={cn(
        'pointer-events-none relative isolate overflow-hidden',
        layout === 'split' && 'min-h-28 self-stretch',
        layout === 'stack' && 'h-32',
        layout === 'column' && 'min-h-44 sm:min-h-full sm:self-stretch',
      )}
    >
      {path ? (
        <RouteMap
          key={activityId}
          className="absolute inset-0 h-full w-full"
          lineColor={SPORT_IDENTITY_HEX[activityType]}
          path={path}
          frameless
        />
      ) : (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}
      <div
        className={cn('pointer-events-none absolute inset-0', completedPreviewFadeClass(layout))}
        aria-hidden
      />
    </div>
  );
}

function CompletedSessionDetailsPanel({
  showMapSlot,
  activityType,
  title,
  metrics,
  layout,
}: {
  showMapSlot: boolean;
  activityType: ActivityType;
  title: string;
  metrics: CompletedSessionPreviewMetric[];
  layout: CompletedSessionPreviewLayout;
}) {
  return (
    <div className={completedPreviewDetailsClass(layout, showMapSlot)}>
      {showMapSlot || layout === 'stack' ? (
        <div className="flex flex-wrap items-center gap-2">
          <ActivityTypeIndicator type={activityType} />
          <p className={completedPreviewTitleClass(layout)}>{title}</p>
        </div>
      ) : null}
      <PreviewMetrics
        compact={layout === 'split' || layout === 'stack'}
        metrics={selectCompletedPreviewMetrics(metrics, layout)}
      />
    </div>
  );
}

function CompletedSessionPreviewGrid({
  showMapSlot,
  activityId,
  activityType,
  title,
  metrics,
  usablePath,
  layout,
}: {
  showMapSlot: boolean;
  activityId: string;
  activityType: ActivityType;
  title: string;
  metrics: CompletedSessionPreviewMetric[];
  usablePath: [number, number][] | null;
  layout: CompletedSessionPreviewLayout;
}) {
  return (
    <div className={cn('grid h-full w-full', completedPreviewGridClass(layout, showMapSlot))}>
      {showMapSlot ? (
        <MapBand
          activityId={activityId}
          activityType={activityType}
          layout={layout}
          path={usablePath}
        />
      ) : (
        <NoMapBand activityType={activityType} layout={layout} title={title} />
      )}
      <CompletedSessionDetailsPanel
        activityType={activityType}
        layout={layout}
        metrics={metrics}
        showMapSlot={showMapSlot}
        title={title}
      />
    </div>
  );
}

function useCompletedPreviewMap(activityId: string, activityType: ActivityType) {
  const mayHavePath = activityMayHaveRoutePath(activityType);
  const stream = useActivityStream(activityId, { enabled: mayHavePath });
  const usablePath = resolveUsableRoutePath(stream.data?.path);
  return {
    usablePath,
    showMapSlot: resolveCompletedSessionMapSlot({
      mayHavePath,
      isPending: stream.isPending,
      isError: stream.isError,
      usablePath,
    }),
  };
}

/**
 * Today completed-session preview — map + fade + KPIs when GPS exists,
 * sport band + KPIs otherwise. Fluid in the Today reading column.
 * `stack` keeps map above metrics for the Plan rail. `split` is the
 * side-by-side variant.
 */
export function CompletedSessionPreview({
  accessibleName,
  activityId,
  activityType,
  className,
  href,
  layout = 'column',
  metrics,
  title,
}: {
  accessibleName?: string;
  activityId: string;
  activityType: ActivityType;
  className?: string;
  href: string;
  layout?: CompletedSessionPreviewLayout;
  metrics: CompletedSessionPreviewMetric[];
  title: string;
}) {
  const { showMapSlot, usablePath } = useCompletedPreviewMap(activityId, activityType);
  const surfaceClass = cn(
    'analysis-panel border-analysis-border/80 rounded-analysis-lg block w-full overflow-hidden border',
    'hover:border-analysis-border transition-[border-color,background-color]',
    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
    layout === 'stack' && 'h-full',
    className,
  );

  return (
    <Link aria-label={accessibleName} className={surfaceClass} href={href}>
      <CompletedSessionPreviewGrid
        activityId={activityId}
        activityType={activityType}
        layout={layout}
        metrics={metrics}
        showMapSlot={showMapSlot}
        title={title}
        usablePath={usablePath}
      />
    </Link>
  );
}

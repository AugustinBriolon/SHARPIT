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
  resolveCompletedSessionMapSlot,
  resolveUsableRoutePath,
} from '@/components/today/rich/completed-session-preview-helpers';

export type CompletedSessionPreviewMetric = {
  label: string;
  value: string;
  unit: string;
};

function PreviewMetrics({ metrics }: { metrics: CompletedSessionPreviewMetric[] }) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <dl
      className={cn(
        'grid w-full gap-3',
        metrics.length >= 3 && 'grid-cols-3',
        metrics.length === 2 && 'grid-cols-2',
        metrics.length === 1 && 'grid-cols-1',
      )}
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <dt className="text-label text-muted-foreground">{metric.label}</dt>
          <dd className="text-data text-foreground mt-1 flex items-baseline gap-1 font-semibold tabular-nums">
            <span className="text-[clamp(1.125rem,3.6vw,1.5rem)] leading-none">{metric.value}</span>
            {metric.unit ? (
              <span className="text-muted-foreground text-xs font-medium">{metric.unit}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function NoMapBand({ activityType, title }: { activityType: ActivityType; title: string }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-30 flex-col justify-end gap-2 border-b px-4 py-4 sm:min-h-0 sm:border-r sm:border-b-0',
        SPORT_IDENTITY_PANEL[activityType],
      )}
    >
      <ActivityTypeIndicator type={activityType} />
      <p className="text-card-title text-balance">{title}</p>
    </div>
  );
}

function MapBand({
  activityId,
  activityType,
  path,
}: {
  activityId: string;
  activityType: ActivityType;
  path: [number, number][] | null;
}) {
  return (
    <div
      aria-busy={!path || undefined}
      className="pointer-events-none relative isolate min-h-44 overflow-hidden sm:min-h-full sm:self-stretch"
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
      {/*
        Opaque veil to #fff. A CSS mask only punches transparency and would
        reveal the page green underneath — not a white fade.
      */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          'bg-linear-to-b from-transparent from-30% to-white',
          'sm:bg-linear-to-r sm:from-transparent sm:from-30% sm:to-white',
        )}
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
}: {
  showMapSlot: boolean;
  activityType: ActivityType;
  title: string;
  metrics: CompletedSessionPreviewMetric[];
}) {
  return (
    <div
      className={cn(
        'relative z-10 flex flex-col justify-end gap-3 bg-[#fff] px-4 pt-2 pb-4',
        'sm:justify-center sm:px-5 sm:py-5',
        showMapSlot && 'sm:pl-2',
      )}
    >
      {showMapSlot ? (
        <div className="flex flex-wrap items-center gap-2">
          <ActivityTypeIndicator type={activityType} />
          <p className="text-card-title min-w-0 truncate text-balance">{title}</p>
        </div>
      ) : null}
      <PreviewMetrics metrics={metrics} />
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
}: {
  showMapSlot: boolean;
  activityId: string;
  activityType: ActivityType;
  title: string;
  metrics: CompletedSessionPreviewMetric[];
  usablePath: [number, number][] | null;
}) {
  return (
    <div
      className={cn(
        'grid w-full',
        showMapSlot
          ? 'sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-stretch'
          : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-stretch',
      )}
    >
      {showMapSlot ? (
        <MapBand activityId={activityId} activityType={activityType} path={usablePath} />
      ) : (
        <NoMapBand activityType={activityType} title={title} />
      )}
      <CompletedSessionDetailsPanel
        activityType={activityType}
        metrics={metrics}
        showMapSlot={showMapSlot}
        title={title}
      />
    </div>
  );
}

/**
 * Today completed-session preview — map + fade + KPIs when GPS exists,
 * sport band + KPIs otherwise. Fluid in the Today reading column.
 */
export function CompletedSessionPreview({
  activityId,
  activityType,
  title,
  href,
  metrics,
  className,
}: {
  activityId: string;
  activityType: ActivityType;
  title: string;
  href: string;
  metrics: CompletedSessionPreviewMetric[];
  className?: string;
}) {
  const mayHavePath = activityMayHaveRoutePath(activityType);
  const { data, isPending, isError } = useActivityStream(activityId, { enabled: mayHavePath });
  const usablePath = resolveUsableRoutePath(data?.path);
  const showMapSlot = resolveCompletedSessionMapSlot({
    mayHavePath,
    isPending,
    isError,
    usablePath,
  });

  return (
    <Link
      href={href}
      className={cn(
        'analysis-panel border-analysis-border/80 rounded-analysis-lg block w-full overflow-hidden border',
        'hover:border-analysis-border transition-[border-color,background-color]',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <CompletedSessionPreviewGrid
        activityId={activityId}
        activityType={activityType}
        metrics={metrics}
        showMapSlot={showMapSlot}
        title={title}
        usablePath={usablePath}
      />
    </Link>
  );
}

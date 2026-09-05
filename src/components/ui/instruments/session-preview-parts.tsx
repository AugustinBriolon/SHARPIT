'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ActivityType } from '@prisma/client';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { SPORT_IDENTITY_PANEL } from '@/lib/activity/sport-identity';
import { cn } from '@/lib/utils';

export type SessionPreviewMetric = {
  label: string;
  value: string;
  unit: string;
};

function metricValueClass(compact: boolean): string {
  return compact
    ? 'min-w-0 leading-tight text-pretty wrap-break-word text-[clamp(0.9375rem,2.8vw,1.125rem)]'
    : 'min-w-0 leading-tight text-pretty wrap-break-word text-[clamp(1.125rem,3.6vw,1.5rem)]';
}

export function SessionPreviewMetrics({
  metrics,
  density = 'comfortable',
}: {
  metrics: SessionPreviewMetric[];
  /** `compact` = tighter type for stacked planned rows. */
  density?: 'comfortable' | 'compact';
}) {
  if (metrics.length === 0) {
    return null;
  }

  const compact = density === 'compact';

  return (
    <dl
      className={cn(
        'grid w-full',
        compact ? 'gap-2' : 'gap-3',
        metrics.length >= 3 && 'grid-cols-3',
        metrics.length === 2 && 'grid-cols-2',
        metrics.length === 1 && 'grid-cols-1',
      )}
    >
      {metrics.map((metric) => (
        <div key={`${metric.label}-${metric.value}`} className="min-w-0">
          <dt className="text-label text-muted-foreground">{metric.label}</dt>
          <dd className="text-data text-foreground mt-1 flex min-w-0 items-baseline gap-1 font-semibold tabular-nums">
            <span className={metricValueClass(compact)}>{metric.value}</span>
            {metric.unit ? (
              <span className="text-muted-foreground shrink-0 text-xs font-medium">
                {metric.unit}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SessionPreviewSportBand({
  activityType,
  title,
  eyebrow,
  children,
}: {
  activityType: ActivityType;
  title: string;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex h-full min-h-30 flex-col justify-end gap-2 border-b px-4 py-4 sm:min-h-0 sm:border-r sm:border-b-0',
        SPORT_IDENTITY_PANEL[activityType],
      )}
    >
      {eyebrow ?? <ActivityTypeIndicator type={activityType} />}
      <p className="text-card-title text-balance">{title}</p>
      {children}
    </div>
  );
}

const FRAME_CLASS =
  'analysis-panel border-analysis-border/80 rounded-analysis-lg block w-full overflow-hidden border hover:border-analysis-border transition-[border-color,background-color] focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none';

export function SessionPreviewLinkFrame({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link className={cn(FRAME_CLASS, className)} href={href}>
      {children}
    </Link>
  );
}

export function SessionPreviewButtonFrame({
  onClick,
  className,
  children,
  ariaExpanded,
}: {
  onClick: () => void;
  className?: string;
  children: ReactNode;
  ariaExpanded?: boolean;
}) {
  return (
    <button
      aria-expanded={ariaExpanded}
      className={cn(FRAME_CLASS, 'cursor-pointer text-left', className)}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SessionPreviewStaticFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(FRAME_CLASS, className)}>{children}</div>;
}

export function SessionPreviewBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-background/90 relative z-10 flex flex-col justify-end gap-3 px-4 pt-2 pb-4',
        'sm:justify-center sm:bg-transparent sm:px-5 sm:py-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SessionPreviewGrid({
  split = 'band',
  children,
}: {
  split?: 'map' | 'band';
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid w-full sm:items-stretch',
        split === 'map'
          ? 'sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'
          : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]',
      )}
    >
      {children}
    </div>
  );
}

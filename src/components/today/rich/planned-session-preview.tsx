'use client';

import type { ActivityType } from '@prisma/client';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import {
  SessionPreviewButtonFrame,
  SessionPreviewMetrics,
  type SessionPreviewMetric,
} from '@/components/ui/instruments/session-preview-parts';
import { cn } from '@/lib/utils';

function plannedDensityClass(density: 'solo' | 'compact'): string {
  if (density === 'solo') {
    return 'min-h-24 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-5';
  }
  return 'py-3';
}

function PriorityBadge({ primary }: { primary: boolean }) {
  if (primary) {
    return (
      <span className="bg-highlight text-foreground text-data rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
        Prioritaire
      </span>
    );
  }
  return <span className="text-muted-foreground text-xs font-medium">Prévu</span>;
}

function MorningChoiceBadge({ label }: { label?: string | null }) {
  if (!label) {
    return null;
  }
  return (
    <span className="text-data text-xs font-semibold text-(--color-signal-caution)">{label}</span>
  );
}

function PlannedSecondaryLine({
  hasMetrics,
  secondary,
}: {
  hasMetrics: boolean;
  secondary?: string | null;
}) {
  if (hasMetrics || !secondary) {
    return null;
  }
  return <p className="text-muted-foreground text-xs text-pretty">{secondary}</p>;
}

function PlannedMetricsBlock({
  density,
  metrics,
}: {
  density: 'solo' | 'compact';
  metrics: SessionPreviewMetric[];
}) {
  if (metrics.length === 0) {
    return null;
  }
  return (
    <div className={cn('min-w-0', density === 'solo' && 'sm:max-w-[55%] sm:shrink-0')}>
      <SessionPreviewMetrics
        density={density === 'solo' ? 'comfortable' : 'compact'}
        metrics={metrics}
      />
    </div>
  );
}

/**
 * Today planned-session preview — compact instrument row (not a map-sized split).
 * `solo` loosens vertical padding when this is the only session in the section.
 */
export function PlannedSessionPreview({
  activityType,
  title,
  metrics,
  secondary = null,
  morningChoiceLabel,
  primary = false,
  density = 'compact',
  onOpen,
  className,
}: {
  activityType: ActivityType;
  title: string;
  metrics: SessionPreviewMetric[];
  /** Fallback when structured KPIs are empty (legacy meta line). */
  secondary?: string | null;
  morningChoiceLabel?: string | null;
  primary?: boolean;
  density?: 'solo' | 'compact';
  onOpen: () => void;
  className?: string;
}) {
  const hasMetrics = metrics.length > 0;

  return (
    <SessionPreviewButtonFrame className={className} onClick={onOpen}>
      <div className={cn('flex min-w-0 flex-col gap-2.5 px-3.5', plannedDensityClass(density))}>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ActivityTypeIndicator type={activityType} />
            <PriorityBadge primary={primary} />
            <MorningChoiceBadge label={morningChoiceLabel} />
          </div>
          <p className="text-card-title text-balance">{title}</p>
          <PlannedSecondaryLine hasMetrics={hasMetrics} secondary={secondary} />
        </div>
        <PlannedMetricsBlock density={density} metrics={metrics} />
      </div>
    </SessionPreviewButtonFrame>
  );
}

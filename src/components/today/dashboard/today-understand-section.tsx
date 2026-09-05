'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import {
  TodayNutritionCard,
  TodayNutritionCardSkeleton,
} from '@/components/today/dashboard/today-nutrition-card';
import { TodaySignalStrip } from '@/components/today/dashboard/today-signal-strip';
import type { ClientActivity } from '@/lib/query/types';
import { cn } from '@/lib/utils';

type MetricsRow = TodayViewModel['hero']['metricsRow'];
type SignalPreviews = TodayViewModel['hero']['signalPreviews'];

/**
 * Tertiary visual evidence — mini signal cards + secondary panels.
 *
 * Lives below the bilan. Never competes with the hero decision above the fold.
 */
export function TodayUnderstandSection({
  metricsRow,
  signalPreviews,
  activities,
  activitiesLoading,
  loading = false,
  className,
}: {
  metricsRow: MetricsRow;
  signalPreviews?: SignalPreviews;
  activities: ClientActivity[];
  activitiesLoading: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="px-0.5">
        <TodaySignalStrip
          loading={loading}
          metricsRow={metricsRow}
          signalPreviews={signalPreviews}
        />
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ActivityConsistencyPanel activities={activities} loading={activitiesLoading || loading} />
        {loading ? <TodayNutritionCardSkeleton /> : <TodayNutritionCard />}
      </div>
    </section>
  );
}

'use client';

import type { TodayViewModel } from '@sharpit/server/presentation/today-view-model';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import {
  TodayNutritionCard,
  TodayNutritionCardSkeleton,
} from '@/components/today/dashboard/today-nutrition-card';
import { TodaySignalStrip } from '@/components/today/dashboard/today-signal-strip';
import { TodayJournalHabitBridgeFooter } from '@/components/today/rich/today-journal-habit-bridge-footer';
import type { ClientActivity } from '@sharpit/server/lib/query/types';
import { cn } from '@sharpit/server/lib/utils';

type MetricsRow = TodayViewModel['hero']['metricsRow'];
type SignalPreviews = TodayViewModel['hero']['signalPreviews'];

/**
 * Tertiary visual evidence — mini signal cards + secondary panels.
 *
 * Lives below the bilan. Never competes with the hero decision above the fold.
 * The journal footnote closes this section rather than the page: the last block
 * an athlete reads should not be a conditional pointer to an analysis.
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
        {!loading ? (
          <div className="min-w-0 lg:col-span-2">
            <TodayJournalHabitBridgeFooter enabled />
          </div>
        ) : null}
      </div>
    </section>
  );
}

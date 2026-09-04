'use client';

import { type ActivityForConsistency } from '@/lib/activity/list/activity-consistency';
import { cn } from '@/lib/utils';
import {
  ActivityConsistencyContent,
  ActivityConsistencyLoading,
  isQuietActivityHistory,
  useActivityConsistencyLayout,
  useActivityConsistencyStats,
} from '@/components/today/dashboard/activity-consistency-panel-parts';

/**
 * Regularity instrument — responsive day rings + weekly streak + header icon.
 * Twin of Nutrition under Today Comprendre (outer text-label + chip body).
 */
export function ActivityConsistencyPanel({
  activities,
  className,
  loading = false,
}: {
  activities: ActivityForConsistency[];
  className?: string;
  loading?: boolean;
}) {
  const { stripRef, layout } = useActivityConsistencyLayout();
  const { stats, days } = useActivityConsistencyStats(activities, loading, layout);
  const quietHistory = isQuietActivityHistory(stats, loading);

  return (
    <section className={cn('flex h-full min-w-0 flex-col px-0.5', className)}>
      <h2 className="text-label">Régularité</h2>
      {loading ? (
        <ActivityConsistencyLoading />
      ) : (
        <ActivityConsistencyContent
          days={days}
          layout={layout}
          quietHistory={quietHistory}
          stats={stats}
          stripRef={stripRef}
        />
      )}
    </section>
  );
}

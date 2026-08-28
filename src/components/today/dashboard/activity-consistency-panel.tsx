'use client';

import { useMemo } from 'react';
import { type ActivityForConsistency } from '@/lib/activity/list/activity-consistency';
import { cn } from '@/lib/utils';
import {
  ActivityConsistencyContent,
  ActivityConsistencyLoading,
  isQuietActivityHistory,
  useActivityConsistencyStats,
} from '@/components/today/dashboard/activity-consistency-panel-parts';

export function ActivityConsistencyPanel({
  activities,
  className,
  loading = false,
}: {
  activities: ActivityForConsistency[];
  className?: string;
  loading?: boolean;
}) {
  const stats = useActivityConsistencyStats(activities, loading);
  const quietHistory = isQuietActivityHistory(stats, loading);

  return (
    <section className={cn('flex h-full min-w-0 flex-col px-0.5', className)}>
      <h2 className="text-label">Régularité</h2>
      {loading ? (
        <ActivityConsistencyLoading />
      ) : (
        <ActivityConsistencyContent quietHistory={quietHistory} stats={stats} />
      )}
    </section>
  );
}

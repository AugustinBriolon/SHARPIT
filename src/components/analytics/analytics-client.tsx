'use client';

import { AnalyticsView } from '@/components/analytics/analytics-view';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivities } from '@/hooks/use-data';

export function AnalyticsClient() {
  const { data, isLoading } = useActivities();

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  return <AnalyticsView activities={data ?? []} />;
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </header>

      <Skeleton className="h-28 rounded-xl" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <section className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </section>

      <section className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </section>
    </div>
  );
}

"use client";

import { AnalyticsView } from "@/components/analytics/analytics-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities } from "@/hooks/use-data";

export function AnalyticsClient() {
  const { data, isLoading } = useActivities();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return <AnalyticsView activities={data ?? []} />;
}

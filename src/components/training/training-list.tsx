'use client';

import { ActivityList } from '@/components/training/activity-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivities } from '@/hooks/use-data';

export function TrainingList() {
  const { data, isPending } = useActivities();

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full" />
        ))}
      </div>
    );
  }

  return <ActivityList activities={data ?? []} />;
}

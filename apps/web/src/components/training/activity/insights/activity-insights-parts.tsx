'use client';

import { MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/ui/skeleton-patterns';
import {
  ActivityCompositionSkeleton,
  ActivityPerformanceSkeleton,
} from '@/components/training/activity/detail/activity-detail-skeleton';

export function ActivityInsightsLoading({
  withCoach,
  withMap,
}: {
  withCoach: boolean;
  withMap: boolean;
}) {
  return (
    <div className="space-y-8">
      <ActivityCompositionSkeleton withCoach={withCoach} withMap={withMap} />
      <ActivityPerformanceSkeleton />
      <section className="space-y-4">
        <p className="text-label">Profils</p>
        <SkeletonCard className="min-h-56 px-5 py-5">
          <Skeleton className="rounded-analysis h-48 w-full border-0" />
        </SkeletonCard>
      </section>
    </div>
  );
}

export function ActivityInsightsUnavailable({
  coachPanel,
  message,
  withIcon = false,
}: {
  coachPanel?: ReactNode;
  message: string;
  withIcon?: boolean;
}) {
  return (
    <div className="space-y-6">
      {coachPanel}
      <Card>
        <CardContent
          className={
            withIcon
              ? 'text-muted-foreground flex items-center gap-2 py-6 text-sm'
              : 'text-muted-foreground py-6 text-sm'
          }
        >
          {withIcon ? <MapPin className="size-4" /> : null}
          {message}
        </CardContent>
      </Card>
    </div>
  );
}

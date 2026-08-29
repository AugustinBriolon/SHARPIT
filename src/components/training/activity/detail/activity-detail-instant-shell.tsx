'use client';

import { ActivityType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ActivityDetailHeader } from '@/components/training/activity/detail/activity-detail-header';
import { ActivityDetailHero } from '@/components/training/activity/detail/activity-detail-hero';
import { ActivityDetailSkeleton } from '@/components/training/activity/detail/activity-detail-skeleton';
import { ActivityMetaRow } from '@/components/training/activity/detail/activity-meta-row';
import { ActivityDetailInsights } from '@/components/training/activity/insights/activity-detail-insights';
import { buildStrengthStats } from '@/components/training/activity/detail/activity-detail-helpers';
import { useActivities } from '@/hooks/use-data';
import { useActivityDetail } from '@/hooks/use-activity-detail';
import { fetchActivityStream } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import {
  activityDetailToDetailShell,
  activityDetailToHeaderActivity,
  clientActivityToDetailShell,
} from '@/lib/activity/detail/activity-detail-cache';
import { activityDetailExpectsMap } from '@/lib/activity/detail/activity-detail-skeleton-layout';
import type { ActivityDetail } from '@/components/training/activity/detail/types';
import type { ClientActivity } from '@/lib/query/types';

function InstantShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-label="Chargement" className="relative z-0 space-y-4 sm:space-y-6">
      {children}
    </div>
  );
}

function CachedActivityInstantBody({ activity }: { activity: ActivityDetail }) {
  const queryClient = useQueryClient();
  const headerActivity = activityDetailToHeaderActivity(activity);
  const isStrength = activity.type === ActivityType.STRENGTH;
  const isTriathlon = activity.type === ActivityType.TRIATHLON;
  const streamCached = queryClient.getQueryData(queryKeys.activityStream(activity.id));
  const showInsights = Boolean(streamCached) && !isStrength && !isTriathlon;

  useEffect(() => {
    if (isStrength || isTriathlon || streamCached) {
      return;
    }
    void queryClient.prefetchQuery({
      queryKey: queryKeys.activityStream(activity.id),
      queryFn: () => fetchActivityStream(activity.id),
      staleTime: Infinity,
    });
  }, [activity.id, isStrength, isTriathlon, queryClient, streamCached]);

  return (
    <>
      <ActivityDetailHeader activity={headerActivity} />
      <div className="relative z-0 space-y-4 sm:space-y-5">
        <ActivityMetaRow activity={activity} records={[]} />
        <ActivityDetailHero
          activity={activity}
          isStrength={isStrength}
          isTriathlon={isTriathlon}
          multisportLegs={null}
          strengthStats={buildStrengthStats(activity)}
        />
      </div>
      {showInsights ? (
        <ActivityDetailInsights
          activityId={activity.id}
          expectMap={activityDetailExpectsMap(activity)}
          isTriathlon={false}
          type={activity.type}
        />
      ) : null}
    </>
  );
}

function listRowToDetailShell(cached: ClientActivity): ActivityDetail {
  return activityDetailToDetailShell(clientActivityToDetailShell(cached));
}

function useCachedActivityShell(id: string | null | undefined): ActivityDetail | undefined {
  const { data: detail } = useActivityDetail(id ?? undefined);
  const { data: activities } = useActivities();

  if (detail) {
    return activityDetailToDetailShell(detail);
  }

  if (!id || !activities) {
    return undefined;
  }

  const listRow = activities.find((activity) => activity.id === id);
  if (!listRow) {
    return undefined;
  }

  return listRowToDetailShell(listRow);
}

/**
 * Instant shell while the activity detail RSC resolves.
 * When the activity is already in the detail or list cache, render real chrome
 * (header, meta, hero) instead of a skeleton — revisit stays Instant.
 */
export function ActivityDetailInstantShell({
  activityId: activityIdProp,
}: {
  activityId?: string;
}) {
  const cached = useCachedActivityShell(activityIdProp);

  if (!cached) {
    return (
      <InstantShellFrame>
        <ActivityDetailSkeleton layout="map" />
      </InstantShellFrame>
    );
  }

  return (
    <InstantShellFrame>
      <CachedActivityInstantBody activity={cached} />
    </InstantShellFrame>
  );
}

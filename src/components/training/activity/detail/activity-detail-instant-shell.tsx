'use client';

import { ActivityType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { ActivityDetailHeader } from '@/components/training/activity/detail/activity-detail-header';
import { ActivityDetailHero } from '@/components/training/activity/detail/activity-detail-hero';
import { ActivityDetailSkeleton } from '@/components/training/activity/detail/activity-detail-skeleton';
import { ActivityMetaRow } from '@/components/training/activity/detail/activity-meta-row';
import { ActivityDetailInsights } from '@/components/training/activity/insights/activity-detail-insights';
import { buildStrengthStats } from '@/components/training/activity/detail/activity-detail-helpers';
import { useActivities } from '@/hooks/use-data';
import { queryKeys } from '@/lib/query/keys';
import {
  clientActivityToDetailShell,
  clientActivityToHeaderActivity,
} from '@/lib/activity/detail/activity-detail-cache';
import { activityDetailExpectsMap } from '@/lib/activity/detail/activity-detail-skeleton-layout';
import type { ClientActivity } from '@/lib/query/types';

function InstantShellFrame({
  includeBackLink,
  children,
}: {
  includeBackLink: boolean;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" aria-label="Chargement" className="relative z-0 space-y-6 sm:space-y-8">
      {includeBackLink ? <MobileBackLink showOnDesktop /> : null}
      {children}
    </div>
  );
}

function CachedActivityInstantBody({ cached }: { cached: ClientActivity }) {
  const queryClient = useQueryClient();
  const activity = clientActivityToDetailShell(cached);
  const headerActivity = clientActivityToHeaderActivity(cached);
  const isStrength = cached.type === ActivityType.STRENGTH;
  const isTriathlon = cached.type === ActivityType.TRIATHLON;
  const streamCached = queryClient.getQueryData(queryKeys.activityStream(cached.id));
  const showInsights = Boolean(streamCached) && !isStrength && !isTriathlon;

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
          activityId={cached.id}
          expectMap={activityDetailExpectsMap(cached)}
          isTriathlon={false}
          type={cached.type}
        />
      ) : null}
    </>
  );
}

function useCachedActivity(id: string | null | undefined): ClientActivity | undefined {
  const { data: activities } = useActivities();
  if (!id || !activities) {
    return undefined;
  }
  return activities.find((activity) => activity.id === id);
}

/**
 * Instant shell while the activity detail RSC resolves.
 * When the activity is already in the shared list cache, render real chrome
 * (header, meta, hero) instead of a skeleton — revisit stays Instant.
 */
export function ActivityDetailInstantShell({
  activityId: activityIdProp,
  includeBackLink = false,
}: {
  activityId?: string;
  includeBackLink?: boolean;
}) {
  const cached = useCachedActivity(activityIdProp);

  if (!cached) {
    return (
      <InstantShellFrame includeBackLink={includeBackLink}>
        <ActivityDetailSkeleton layout="map" />
      </InstantShellFrame>
    );
  }

  return (
    <InstantShellFrame includeBackLink={includeBackLink}>
      <CachedActivityInstantBody cached={cached} />
    </InstantShellFrame>
  );
}

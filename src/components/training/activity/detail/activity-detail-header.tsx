'use client';

import { StickyHeader } from '@/components/layout/sticky-header';
import { LinkHikeActivitiesSheet } from '@/components/training/trip/link-hike-activities-sheet';
import {
  ActivityDetailHeaderContent,
  type ActivityDetailHeaderActivity,
} from '@/components/training/activity/detail/activity-detail-header-content';
import { useActivityDetailHeaderActions } from '@/components/training/activity/detail/use-activity-detail-header-actions';

export type { ActivityDetailHeaderActivity };

export function ActivityDetailHeader({ activity }: { activity: ActivityDetailHeaderActivity }) {
  const header = useActivityDetailHeaderActions(activity);

  return (
    <StickyHeader>
      <ActivityDetailHeaderContent
        activity={activity}
        editHref={header.editHref}
        hikeTrip={header.hikeTrip}
        isHike={header.isHike}
        plannedSessionId={header.plannedSession?.id}
        onDelete={header.handleDelete}
        onLinkHikes={header.openLinkHikes}
      />
      {header.dialog}
      {header.isHike && !header.hikeTrip ? (
        <LinkHikeActivitiesSheet
          open={header.linkHikesOpen}
          seedActivityId={activity.id}
          onOpenChange={header.setLinkHikesOpen}
        />
      ) : null}
    </StickyHeader>
  );
}

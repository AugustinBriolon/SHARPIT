'use client';

import { ActivityType } from '@prisma/client';
import { ExpertModeBadge } from '@/components/display-mode';
import { DiscussCoachLink } from './discuss-coach-link';
import { ActivityDetailActionsMenu } from '@/components/training/activity/detail/activity-detail-header-actions';
import { activityTypeLabels } from '@/lib/format';
import {
  formatActivityDetailMeta,
  formatActivityDetailStats,
  sportIcon,
} from './activity-detail-helpers';
import type { ActivityDetail } from './types';

export type ActivityDetailHeaderActivity = Pick<
  ActivityDetail,
  | 'id'
  | 'type'
  | 'title'
  | 'date'
  | 'source'
  | 'garminId'
  | 'stravaId'
  | 'duration'
  | 'load'
  | 'rpe'
  | 'hikeTrip'
  | 'plannedSession'
>;
import { useDisplayMode } from '@/providers/display-mode-provider';

export function ActivityDetailHeaderContent({
  activity,
  plannedSessionId,
  editHref,
  isHike,
  hikeTrip,
  onDelete,
  onLinkHikes,
}: {
  activity: ActivityDetailHeaderActivity;
  plannedSessionId?: string;
  editHref: string;
  isHike: boolean;
  hikeTrip: ActivityDetailHeaderActivity['hikeTrip'];
  onDelete: () => void;
  onLinkHikes: () => void;
}) {
  const { mode } = useDisplayMode();
  const Icon = sportIcon[activity.type];

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="icon-well size-11 sm:size-12" aria-hidden>
          <Icon className="size-5 sm:size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-muted-foreground text-sm tracking-wide">
              {formatActivityDetailMeta(activity)}
            </p>
            <ExpertModeBadge />
          </div>
          <h1 className="text-page-title mt-1.5 leading-snug wrap-break-word">
            {activity.title ?? activityTypeLabels[activity.type]}
          </h1>
          <p className="text-data text-muted-foreground mt-1.5 text-sm tabular-nums">
            {formatActivityDetailStats(activity, mode)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-1 sm:gap-1.5">
        <DiscussCoachLink activityId={activity.id} plannedSessionId={plannedSessionId} />
        <ActivityDetailActionsMenu
          activity={activity}
          editHref={editHref}
          hikeTrip={hikeTrip}
          isHike={isHike}
          onDelete={onDelete}
          onLinkHikes={onLinkHikes}
        />
      </div>
    </div>
  );
}

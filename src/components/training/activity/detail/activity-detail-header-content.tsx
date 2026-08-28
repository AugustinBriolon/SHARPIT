'use client';

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
import { useDisplayMode } from '@/providers/display-mode-provider';

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

function ActivityHeaderActions({
  activity,
  plannedSessionId,
  editHref,
  hikeTrip,
  isHike,
  onDelete,
  onLinkHikes,
  compact,
}: {
  activity: ActivityDetailHeaderActivity;
  plannedSessionId?: string;
  editHref: string;
  hikeTrip: ActivityDetailHeaderActivity['hikeTrip'];
  isHike: boolean;
  onDelete: () => void;
  onLinkHikes: () => void;
  compact?: boolean;
}) {
  return (
    <>
      <DiscussCoachLink
        activityId={activity.id}
        compact={compact}
        plannedSessionId={plannedSessionId}
      />
      <ActivityDetailActionsMenu
        activity={activity}
        editHref={editHref}
        hikeTrip={hikeTrip}
        isHike={isHike}
        onDelete={onDelete}
        onLinkHikes={onLinkHikes}
      />
    </>
  );
}

function ActivityHeaderIdentity({
  activity,
  title,
  mode,
}: {
  activity: ActivityDetailHeaderActivity;
  title: string;
  mode: ReturnType<typeof useDisplayMode>['mode'];
}) {
  const Icon = sportIcon[activity.type];

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span className="icon-well size-10 shrink-0 sm:size-12" aria-hidden>
        <Icon className="size-5 sm:size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-muted-foreground text-xs tracking-wide sm:text-sm">
            {formatActivityDetailMeta(activity)}
          </p>
          <ExpertModeBadge />
        </div>
        <h1 className="text-page-title mt-1 leading-snug wrap-break-word">{title}</h1>
        <p className="text-data text-muted-foreground mt-1 text-sm tabular-nums">
          {formatActivityDetailStats(activity, mode)}
        </p>
      </div>
    </div>
  );
}

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
  const title = activity.title ?? activityTypeLabels[activity.type];
  const actions = {
    activity,
    plannedSessionId,
    editHref,
    hikeTrip,
    isHike,
    onDelete,
    onLinkHikes,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1 lg:hidden">
        <ActivityHeaderActions {...actions} compact />
      </div>
      <div className="flex items-start justify-between gap-3">
        <ActivityHeaderIdentity activity={activity} mode={mode} title={title} />
        <div className="hidden shrink-0 items-start gap-1.5 lg:flex">
          <ActivityHeaderActions {...actions} />
        </div>
      </div>
    </div>
  );
}

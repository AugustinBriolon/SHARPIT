'use client';

import { ExpertModeBadge } from '@/components/display-mode';
import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { ActivityDetailActionsMenu } from '@/components/training/activity/detail/activity-detail-header-actions';
import { ActivityDetailBackLink } from '@/components/training/activity/detail/activity-detail-back-link';
import { ActivityHeaderContextChips } from '@/components/training/activity/detail/activity-header-context-chips';
import { activityTypeLabels } from '@/lib/format';
import {
  formatActivityDetailMeta,
  formatActivityDetailStats,
  sportIcon,
} from './activity-detail-helpers';
import type { ActivityDetail } from './types';
import { useDisplayMode } from '@/providers/display-mode-provider';
import type { PlannedSessionSummary } from './types';

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
  | 'feeling'
  | 'hikeTrip'
  | 'plannedSession'
>;

function ActivityDetailHeaderToolbar({
  activity,
  editHref,
  hikeTrip,
  isHike,
  onDelete,
  onLinkHikes,
}: {
  activity: ActivityDetailHeaderActivity;
  editHref: string;
  hikeTrip: ActivityDetailHeaderActivity['hikeTrip'];
  isHike: boolean;
  onDelete: () => void;
  onLinkHikes: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <ActivityDetailBackLink />
      <ActivityDetailActionsMenu
        activity={activity}
        editHref={editHref}
        hikeTrip={hikeTrip}
        isHike={isHike}
        onDelete={onDelete}
        onLinkHikes={onLinkHikes}
      />
    </div>
  );
}

function ActivityDetailIdentityBlock({
  activity,
  title,
  summary,
}: {
  activity: ActivityDetailHeaderActivity;
  title: string;
  summary: string;
}) {
  const Icon = sportIcon[activity.type];

  return (
    <div className="flex items-start gap-3">
      <span className="icon-well size-9 shrink-0 sm:size-10" aria-hidden>
        <Icon className="size-4 sm:size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-muted-foreground text-xs tracking-wide">
          {formatActivityDetailMeta(activity)}
        </p>
        <h1 className="text-page-title line-clamp-2 leading-snug wrap-break-word">{title}</h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-data text-muted-foreground text-sm tabular-nums">{summary}</p>
          <ExpertModeBadge />
        </div>
      </div>
    </div>
  );
}

function ActivityDetailHeaderCoachSection({
  activityId,
  feeling,
  rpe,
  plannedSession,
  plannedAnalysisReady,
}: {
  activityId: string;
  feeling: string | null;
  rpe: number | null;
  plannedSession: PlannedSessionSummary | null;
  plannedAnalysisReady: boolean;
}) {
  return (
    <div className="space-y-3">
      <DiscussWithCoachButton
        className="w-full"
        label="Discuter de cette séance"
        size="sm"
        target={{ kind: 'activity', activityId }}
      />
      <ActivityHeaderContextChips
        activityId={activityId}
        feeling={feeling}
        plannedAnalysisReady={plannedAnalysisReady}
        plannedSession={plannedSession}
        rpe={rpe}
      />
    </div>
  );
}

export function ActivityDetailHeaderContent({
  activity,
  plannedSession,
  editHref,
  isHike,
  hikeTrip,
  onDelete,
  onLinkHikes,
}: {
  activity: ActivityDetailHeaderActivity;
  plannedSession: PlannedSessionSummary | null;
  editHref: string;
  isHike: boolean;
  hikeTrip: ActivityDetailHeaderActivity['hikeTrip'];
  onDelete: () => void;
  onLinkHikes: () => void;
}) {
  const { mode } = useDisplayMode();
  const title = activity.title ?? activityTypeLabels[activity.type];
  const summary = formatActivityDetailStats(activity, mode);
  const plannedAnalysisReady = Boolean(plannedSession?.analysis && plannedSession.analyzedAt);

  return (
    <div className="space-y-2.5">
      <ActivityDetailHeaderToolbar
        activity={activity}
        editHref={editHref}
        hikeTrip={hikeTrip}
        isHike={isHike}
        onDelete={onDelete}
        onLinkHikes={onLinkHikes}
      />

      <ActivityDetailIdentityBlock activity={activity} summary={summary} title={title} />

      <ActivityDetailHeaderCoachSection
        activityId={activity.id}
        feeling={activity.feeling}
        plannedAnalysisReady={plannedAnalysisReady}
        plannedSession={plannedSession}
        rpe={activity.rpe}
      />
    </div>
  );
}

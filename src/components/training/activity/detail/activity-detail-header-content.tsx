'use client';

import { ExpertModeBadge } from '@/components/display-mode';
import { DiscussWithCoachButton } from '@/components/coach/discuss/discuss-with-coach-button';
import { ActivityDetailActionsMenu } from '@/components/training/activity/detail/activity-detail-header-actions';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { ActivityHeaderContextChips } from '@/components/training/activity/detail/activity-header-context-chips';
import { SessionPlate } from '@/components/training/activity/reading/session-plate';
import { activityTypeLabels } from '@/lib/format';
import {
  formatActivityDetailLoad,
  formatActivityDetailMeta,
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
  | 'weather'
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
      <MobileBackLink showOnDesktop />
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
  summary: string | null;
}) {
  const Icon = sportIcon[activity.type];

  return (
    <div className="flex items-start gap-3">
      <span className="activity-log-stamp icon-well size-10 shrink-0 sm:size-11" aria-hidden>
        <Icon className="size-4 sm:size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-muted-foreground text-xs tracking-wide">
          {formatActivityDetailMeta(activity)}
        </p>
        <h1 className="text-page-title leading-snug wrap-break-word">{title}</h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {summary ? (
            <p className="text-data text-muted-foreground text-sm tabular-nums">{summary}</p>
          ) : null}
          <ExpertModeBadge />
        </div>
      </div>
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
  const summary = formatActivityDetailLoad(activity, mode);
  const plannedAnalysisReady = Boolean(plannedSession?.analysis && plannedSession.analyzedAt);

  return (
    <SessionPlate
      identity={<ActivityDetailIdentityBlock activity={activity} summary={summary} title={title} />}
      actions={
        <div className="flex flex-col items-stretch gap-3 sm:items-start">
          <DiscussWithCoachButton
            className="w-full sm:w-auto"
            label="Discuter de cette séance"
            size="sm"
            target={{ kind: 'activity', activityId: activity.id }}
          />
          <ActivityHeaderContextChips
            activityId={activity.id}
            activityTitle={activity.title}
            activityType={activity.type}
            feeling={activity.feeling}
            plannedAnalysisReady={plannedAnalysisReady}
            plannedSession={plannedSession}
            rpe={activity.rpe}
            weather={activity.weather}
          />
        </div>
      }
      toolbar={
        <ActivityDetailHeaderToolbar
          activity={activity}
          editHref={editHref}
          hikeTrip={hikeTrip}
          isHike={isHike}
          onDelete={onDelete}
          onLinkHikes={onLinkHikes}
        />
      }
    />
  );
}

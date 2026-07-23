import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { StickyHeader } from '@/components/layout/sticky-header';
import { DeleteActivityButton } from '@/components/training/activity/activity-list';
import { DiscussCoachLink } from '@/components/training/activity/discuss-coach-link';
import { LinkButton } from '@/components/ui/link-button';
import { SPORT_IDENTITY_SURFACE, SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import { activityTypeLabels, formatDate, formatDuration } from '@/lib/format';
import { formatFosterLoadHint } from '@/lib/training/foster-session-load';
import { cn } from '@/lib/utils';
import { activitySourceLabel, sportIcon } from './activity-detail-helpers';
import type { ActivityDetail } from './types';

export function ActivityDetailHeader({ activity }: { activity: ActivityDetail }) {
  const Icon = sportIcon[activity.type];
  const sportText = SPORT_IDENTITY_TEXT[activity.type];
  const fosterHint = formatFosterLoadHint(activity.duration, activity.rpe, activity.load);

  return (
    <StickyHeader>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={cn(
              'rounded-analysis-lg grid size-12 shrink-0 place-items-center',
              SPORT_IDENTITY_SURFACE[activity.type],
            )}
          >
            <Icon className="size-6" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ActivityTypeIndicator type={activity.type} />
              <span className="text-muted-foreground text-sm">
                {formatDate(new Date(activity.date))}
              </span>
              <span className="text-muted-foreground/70 text-xs tracking-wider uppercase">
                · {activitySourceLabel(activity)}
              </span>
            </div>
            <h1 className="text-page-title mt-1">
              {activity.title ?? activityTypeLabels[activity.type]}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm">
              <span className="text-foreground/80">{formatDuration(activity.duration)}</span>
              {activity.load != null && (
                <span className={cn('font-semibold', sportText)}>
                  · {Math.round(activity.load)} TSS
                </span>
              )}
              {fosterHint != null && <span className="text-muted-foreground">· {fosterHint}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DiscussCoachLink
            activityId={activity.id}
            plannedSessionId={activity.plannedSession?.id}
          />
          <LinkButton href={`/training/${activity.id}/edit`} variant="outline">
            Modifier
          </LinkButton>
          <DeleteActivityButton id={activity.id} />
        </div>
      </div>
    </StickyHeader>
  );
}

import { StickyHeader } from '@/components/layout/sticky-header';
import { DeleteActivityButton } from '@/components/training/activity-list';
import { DiscussCoachLink } from '@/components/training/discuss-coach-link';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/link-button';
import { activityTypeLabels, formatDate, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { activitySourceLabel, sportIcon, sportIconWrap } from './activity-detail-helpers';
import type { ActivityDetail } from './types';

export function ActivityDetailHeader({ activity }: { activity: ActivityDetail }) {
  const Icon = sportIcon[activity.type];

  return (
    <StickyHeader>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              'grid size-12 shrink-0 place-items-center rounded-2xl',
              sportIconWrap[activity.type],
            )}
          >
            <Icon className="size-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{activityTypeLabels[activity.type]}</Badge>
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
                <span className="text-primary">· {Math.round(activity.load)} TSS</span>
              )}
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

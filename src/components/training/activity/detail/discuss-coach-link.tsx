import { MessageCircle } from 'lucide-react';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { LinkButton } from '@/components/ui/link-button';
import { coachDiscussHref } from '@/lib/coach/chat/coach-discuss-href';
import { cn } from '@/lib/utils';

export function DiscussCoachLink({
  activityId,
  plannedSessionId,
  planningHorizon,
  compact = false,
}: {
  activityId?: string;
  plannedSessionId?: string | null;
  planningHorizon?: ProjectionHorizonDays;
  /** Icon-only toolbar control for mobile activity headers. */
  compact?: boolean;
}) {
  let href = '/coach';
  if (planningHorizon) {
    href = coachDiscussHref({ kind: 'planning', horizonDays: planningHorizon });
  } else if (plannedSessionId) {
    href = coachDiscussHref({ kind: 'planned-session', sessionId: plannedSessionId });
  } else if (activityId) {
    href = coachDiscussHref({ kind: 'activity', activityId });
  }

  if (compact) {
    return (
      <LinkButton
        aria-label="Discuter avec le coach"
        className={cn('text-muted-foreground size-8 shrink-0 px-0')}
        href={href}
        size="icon-sm"
        variant="ghost"
      >
        <MessageCircle className="size-4" aria-hidden />
      </LinkButton>
    );
  }

  return (
    <LinkButton className="shrink-0 gap-1.5 px-3" href={href} size="sm" variant="highlight">
      <MessageCircle className="size-3.5" aria-hidden />
      <span className="sr-only">Coach</span>
      <span className="hidden sm:inline">Discuter avec le coach</span>
    </LinkButton>
  );
}

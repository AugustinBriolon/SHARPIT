import { MessageCircle } from 'lucide-react';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { LinkButton } from '@/components/ui/link-button';
import { coachDiscussHref } from '@/lib/coach/chat/coach-discuss-href';

export function DiscussCoachLink({
  activityId,
  plannedSessionId,
  planningHorizon,
}: {
  activityId?: string;
  plannedSessionId?: string | null;
  planningHorizon?: ProjectionHorizonDays;
}) {
  // Built by the canonical helper, not by hand: three copies of the same query
  // string in two files is how a rename quietly breaks one of them.
  let href = '/coach';
  if (planningHorizon) {
    href = coachDiscussHref({ kind: 'planning', horizonDays: planningHorizon });
  } else if (plannedSessionId) {
    href = coachDiscussHref({ kind: 'planned-session', sessionId: plannedSessionId });
  } else if (activityId) {
    href = coachDiscussHref({ kind: 'activity', activityId });
  }

  return (
    <LinkButton className="shrink-0 gap-1.5 px-3" href={href} size="sm" variant="highlight">
      <MessageCircle className="size-3.5" aria-hidden />
      <span className="sr-only">Coach</span>
      <span className="hidden sm:inline">Discuter avec le coach</span>
    </LinkButton>
  );
}

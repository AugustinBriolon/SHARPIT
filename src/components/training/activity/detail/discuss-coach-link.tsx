import { MessageCircle } from 'lucide-react';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { LinkButton } from '@/components/ui/link-button';

export function DiscussCoachLink({
  activityId,
  plannedSessionId,
  planningHorizon,
}: {
  activityId?: string;
  plannedSessionId?: string | null;
  planningHorizon?: ProjectionHorizonDays;
}) {
  let href = '/coach';
  if (planningHorizon) {
    href = `/coach?discussPlanning=${planningHorizon}`;
  } else if (plannedSessionId) {
    href = `/coach?discuss=${plannedSessionId}`;
  } else if (activityId) {
    href = `/coach?discussActivity=${activityId}`;
  }

  return (
    <LinkButton className="shrink-0 gap-1.5 px-3" href={href} size="sm" variant="highlight">
      <MessageCircle className="size-3.5" aria-hidden />
      <span className="sr-only">Coach</span>
      <span className="hidden sm:inline">Discuter avec le coach</span>
    </LinkButton>
  );
}

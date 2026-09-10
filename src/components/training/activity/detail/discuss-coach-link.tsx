import type { ProjectionHorizonDays } from '@/core/projection/types';
import {
  COACH_DISCUSS_LABEL,
  CoachDiscussIcon,
  DiscussWithCoachButton,
} from '@/components/coach/discuss/discuss-with-coach-button';
import { LinkButton } from '@/components/ui/link-button';
import { coachDiscussHref } from '@/lib/coach/chat/discuss/coach-discuss-href';
import { cn } from '@/lib/utils';

/**
 * Activity / planning toolbar entry that resolves a discuss target, then uses
 * the same Coach CTA contract as DiscussWithCoachButton (label + icon).
 * Compact = icon-only with the canonical aria-label.
 */
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
  let target: Parameters<typeof DiscussWithCoachButton>[0]['target'] | null = null;
  if (planningHorizon) {
    target = { kind: 'planning', horizonDays: planningHorizon };
  } else if (plannedSessionId) {
    target = { kind: 'planned-session', sessionId: plannedSessionId };
  } else if (activityId) {
    target = { kind: 'activity', activityId };
  }

  if (!target) {
    return (
      <LinkButton className="shrink-0 gap-1.5" href="/coach" size="sm" variant="outline">
        <CoachDiscussIcon aria-hidden />
        {COACH_DISCUSS_LABEL}
      </LinkButton>
    );
  }

  if (compact) {
    return (
      <LinkButton
        aria-label={COACH_DISCUSS_LABEL}
        className={cn('text-muted-foreground size-8 shrink-0 px-0')}
        href={coachDiscussHref(target)}
        size="icon-sm"
        variant="ghost"
      >
        <CoachDiscussIcon className="size-4" aria-hidden />
      </LinkButton>
    );
  }

  return <DiscussWithCoachButton size="sm" target={target} />;
}

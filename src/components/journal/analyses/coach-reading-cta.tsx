import {
  COACH_DISCUSS_LABEL,
  CoachDiscussIcon,
  DiscussWithCoachButton,
} from '@/components/coach/discuss/discuss-with-coach-button';
import { LinkButton } from '@/components/ui/link-button';

/** « Lecture coach · journal » is Pro — the server re-checks it (ADR-030). */
export function CoachReadingCta({ isPro }: { isPro: boolean }) {
  if (!isPro) {
    return (
      <LinkButton href="/settings/pro" size="sm" variant="outline">
        <CoachDiscussIcon aria-hidden />
        {COACH_DISCUSS_LABEL}
        <span className="text-muted-foreground font-normal"> · Pro</span>
      </LinkButton>
    );
  }

  return <DiscussWithCoachButton size="sm" target={{ kind: 'journal-analyses' }} />;
}

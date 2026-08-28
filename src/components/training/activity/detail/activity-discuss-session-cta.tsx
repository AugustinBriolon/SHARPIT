import { ChevronRight, Sparkles } from 'lucide-react';
import { LinkButton } from '@/components/ui/link-button';
import { coachDiscussHref } from '@/lib/coach/chat/coach-discuss-href';

/** Contextual coach entry — intelligence layer on this session, not generic messaging. */
export function ActivityDiscussSessionCta({ activityId }: { activityId: string }) {
  return (
    <LinkButton
      className="border-analysis-border/70 bg-analysis-surface-alt/50 hover:bg-analysis-surface-alt h-auto w-full justify-between gap-3 px-4 py-2.5 text-left font-normal"
      href={coachDiscussHref({ kind: 'activity', activityId })}
      variant="outline"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Sparkles className="text-primary size-4 shrink-0" aria-hidden />
        <span className="text-sm font-medium">Discuter de cette séance</span>
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
    </LinkButton>
  );
}

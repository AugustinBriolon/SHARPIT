import type { ActivityType } from '@prisma/client';
import type { ActivityNarrative } from '@/lib/validators/coach';
import type { DisplayMode } from '@/lib/preferences/display-mode';
import {
  dedupeHeadlineAgainstTitle,
  presentNarrativeBody,
} from '@/components/training/activity/reading/narrative-presentation';

interface ActivityNarrativeCardProps {
  analysis: ActivityNarrative;
  narrativeAnalyzedAt: Date | string | null;
  activityType: ActivityType;
  activityTitle?: string | null;
  mode?: DisplayMode;
}

export function ActivityNarrativeCard({
  analysis,
  narrativeAnalyzedAt,
  activityTitle,
  mode = 'essential',
}: ActivityNarrativeCardProps) {
  if (!narrativeAnalyzedAt) {
    return null;
  }

  const headline = dedupeHeadlineAgainstTitle(analysis.headline, activityTitle);
  const body = presentNarrativeBody(analysis.narrative, mode);

  return (
    <section className="activity-log-coach flex h-full flex-col space-y-3 px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-verdict text-foreground text-balance">{headline}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
    </section>
  );
}

import type { ActivityType } from '@prisma/client';
import type { ReactNode } from 'react';
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
  /** Quiet footer inside the coach plate (e.g. demo sign-up). */
  footer?: ReactNode;
}

export function ActivityNarrativeCard({
  analysis,
  narrativeAnalyzedAt,
  activityTitle,
  mode = 'essential',
  footer,
}: ActivityNarrativeCardProps) {
  if (!narrativeAnalyzedAt) {
    return null;
  }

  const headline = dedupeHeadlineAgainstTitle(analysis.headline, activityTitle);
  const body = presentNarrativeBody(analysis.narrative, mode);

  return (
    <section className="activity-log-coach flex h-full flex-col px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-3">
        <h2 className="text-verdict text-foreground text-balance">{headline}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
      </div>
      {footer ? (
        <div className="border-analysis-border/60 mt-auto border-t pt-3">{footer}</div>
      ) : null}
    </section>
  );
}

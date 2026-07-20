import { Brain } from 'lucide-react';
import type { ActivityType } from '@prisma/client';
import { SPORT_IDENTITY_PANEL, SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import type { ActivityNarrative } from '@/lib/validators/coach';
import { cn } from '@/lib/utils';

interface ActivityNarrativeCardProps {
  analysis: ActivityNarrative;
  narrativeAnalyzedAt: Date | string | null;
  activityType: ActivityType;
}

export function ActivityNarrativeCard({
  analysis,
  narrativeAnalyzedAt,
  activityType,
}: ActivityNarrativeCardProps) {
  if (!narrativeAnalyzedAt) return null;

  const sportText = SPORT_IDENTITY_TEXT[activityType];
  const sportPanel = SPORT_IDENTITY_PANEL[activityType];

  return (
    <section
      className={cn('rounded-analysis-lg space-y-5 border px-5 py-5 sm:px-6 sm:py-6', sportPanel)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Brain className={cn('size-4 shrink-0', sportText)} />
          <p className={cn('text-label', sportText)}>Analyse coach</p>
        </div>
      </div>

      <h2 className="text-verdict text-foreground mt-5">{analysis.headline}</h2>

      <p className="text-muted-foreground text-sm leading-relaxed">{analysis.narrative}</p>
    </section>
  );
}

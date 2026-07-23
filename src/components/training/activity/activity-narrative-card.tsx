import type { ActivityType } from '@prisma/client';
import type { ActivityNarrative } from '@/lib/validators/coach';

interface ActivityNarrativeCardProps {
  analysis: ActivityNarrative;
  narrativeAnalyzedAt: Date | string | null;
  activityType: ActivityType;
}

export function ActivityNarrativeCard({
  analysis,
  narrativeAnalyzedAt,
}: ActivityNarrativeCardProps) {
  if (!narrativeAnalyzedAt) return null;

  return (
    <section className="bg-analysis-surface-alt rounded-analysis-lg space-y-3 px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-label inline-flex items-center gap-2">
        <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
        Lecture du coach
      </p>

      <h2 className="text-verdict text-foreground">{analysis.headline}</h2>

      <p className="text-muted-foreground text-sm leading-relaxed">{analysis.narrative}</p>
    </section>
  );
}

import { Brain } from 'lucide-react';
import type { ActivityNarrative } from '@/lib/validators/coach';

interface ActivityNarrativeCardProps {
  analysis: ActivityNarrative;
  narrativeAnalyzedAt: Date | string | null;
}

export function ActivityNarrativeCard({
  analysis,
  narrativeAnalyzedAt,
}: ActivityNarrativeCardProps) {
  if (!narrativeAnalyzedAt) return null;

  return (
    <section className="analysis-panel-alt rounded-analysis-lg space-y-5 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Brain className="text-primary size-4 shrink-0" />
          <p className="text-label">Analyse coach</p>
        </div>
      </div>

      <h2 className="text-verdict text-foreground mt-5">{analysis.headline}</h2>

      <p className="text-muted-foreground text-sm leading-relaxed">{analysis.narrative}</p>
    </section>
  );
}

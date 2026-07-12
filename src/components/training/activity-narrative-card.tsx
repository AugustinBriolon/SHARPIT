import { Sparkles } from 'lucide-react';
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

  const analyzedLabel = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(narrativeAnalyzedAt));

  return (
    <section className="analysis-panel-alt rounded-analysis-lg space-y-5 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-4 shrink-0" />
          <p className="text-label">Analyse coach</p>
        </div>
        <p className="text-muted-foreground text-xs">Générée le {analyzedLabel}</p>
      </div>

      <h2 className="font-heading text-foreground mt-5 text-xl leading-snug font-semibold tracking-tight sm:text-[1.55rem]">
        {analysis.headline}
      </h2>

      <div className="space-y-4">
        <p className="text-muted-foreground text-sm leading-relaxed">{analysis.narrative}</p>

        {analysis.highlights.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {analysis.highlights.map((item) => (
              <li
                key={item}
                className="bg-analysis-surface/80 border-analysis-border/60 rounded-analysis flex gap-2.5 border px-3 py-2.5 text-sm leading-snug"
              >
                <span className="text-primary mt-0.5 shrink-0 font-medium">·</span>
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

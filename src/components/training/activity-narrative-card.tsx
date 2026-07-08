import { Card, CardContent } from '@/components/ui/card';
import { activityNarrativeSchema, type ActivityNarrative } from '@/lib/validators/coach';
import { Sparkles } from 'lucide-react';

interface ActivityNarrativeCardProps {
  narrativeAnalysis: unknown;
  narrativeAnalyzedAt: Date | string | null;
}

function parseNarrative(raw: unknown): ActivityNarrative | null {
  const parsed = activityNarrativeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function ActivityNarrativeCard({
  narrativeAnalysis,
  narrativeAnalyzedAt,
}: ActivityNarrativeCardProps) {
  const analysis = parseNarrative(narrativeAnalysis);
  if (!analysis || !narrativeAnalyzedAt) return null;

  const analyzedLabel = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(narrativeAnalyzedAt));

  return (
    <Card className="border-primary/25 from-primary/5 bg-linear-to-br to-transparent">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-4 shrink-0" />
            <h2 className="font-medium">Analyse coach</h2>
          </div>
          <p className="text-muted-foreground text-xs">Générée le {analyzedLabel}</p>
        </div>

        <p className="text-base font-medium">{analysis.headline}</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{analysis.narrative}</p>

        {analysis.highlights.length > 0 && (
          <ul className="text-muted-foreground space-y-1 text-sm">
            {analysis.highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

import type { ReactNode } from 'react';
import { ThermometerSun } from 'lucide-react';
import type { ActivityEnvironmentalCorrection } from '@/core/environment';
import { Card, CardContent } from '@/components/ui/card';
import { resolveEnvironmentalExplanation } from '@/lib/presentation/environment';

interface ActivityEnvironmentInsightProps {
  correction: ActivityEnvironmentalCorrection;
}

function environmentInsightBody(narrativeLines: string[], penaltyPct: number | null): ReactNode {
  if (narrativeLines.length > 0) {
    return (
      <div className="space-y-1.5">
        {narrativeLines.map((line) => (
          <p key={line} className="text-foreground text-sm leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    );
  }

  if (penaltyPct != null && penaltyPct > 0) {
    return (
      <p className="text-foreground text-sm leading-relaxed">
        Environnement : environ {penaltyPct} % du ralentissement peut s&apos;expliquer par les
        conditions.
      </p>
    );
  }

  return null;
}

export function ActivityEnvironmentInsight({ correction }: ActivityEnvironmentInsightProps) {
  if (correction.factors.length === 0 && correction.narrative.length === 0) {
    return null;
  }

  const penaltyPct =
    correction.totalAttributedEffect.available && correction.totalAttributedEffect.value != null
      ? Math.round(correction.totalAttributedEffect.value * 100)
      : null;

  const narrativeLines = correction.narrative.map((item) =>
    resolveEnvironmentalExplanation(item.code, item.params),
  );

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ThermometerSun className="text-primary size-4 shrink-0" />
          <p className="text-label">Contexte environnemental</p>
        </div>

        {environmentInsightBody(narrativeLines, penaltyPct)}

        {correction.factors.length > 0 ? (
          <ul className="text-muted-foreground space-y-1 text-xs">
            {correction.factors.map((factor) => (
              <li key={factor.stressorId}>
                {factor.explanation}
                {factor.attributedEffect.available && factor.attributedEffect.value != null
                  ? ` (+${Math.round(factor.attributedEffect.value * 100)} %)`
                  : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

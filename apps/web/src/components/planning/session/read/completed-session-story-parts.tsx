'use client';

import {
  parseSessionAnalysis,
  SESSION_VERDICT_LABELS,
  sessionScoreColor,
} from '@sharpit/server/lib/planned-session/display/session-analysis-display';
import { cn } from '@sharpit/server/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Note d'exécution — instrument line under Lecture title, before the narrative.
 */
export function ExecutionScoreBlock({
  analysis,
  isAnalyzing,
}: {
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
}) {
  if (analysis) {
    return (
      <div className="space-y-1">
        <p className="text-label">Note d&apos;exécution</p>
        <p
          aria-label={`Note d'exécution : ${analysis.complianceScore} sur 100, ${SESSION_VERDICT_LABELS[analysis.verdict]}`}
          className="text-data flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
        >
          <span
            className={cn(
              'text-2xl leading-none font-semibold tabular-nums',
              sessionScoreColor(analysis.complianceScore),
            )}
          >
            {analysis.complianceScore}
          </span>
          <span className="text-muted-foreground text-sm">/100</span>
          <span className="text-foreground text-sm font-medium">
            {SESSION_VERDICT_LABELS[analysis.verdict]}
          </span>
        </p>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="space-y-1">
        <p className="text-label">Note d&apos;exécution</p>
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm" role="status">
          <Loader2
            className="text-primary size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          Calcul en cours…
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Evidence under the Lecture: findings then orientation.
 * Visual weight stays below the narrative.
 */
export function CompletedSessionPlanGaps({
  analysis,
}: {
  analysis: NonNullable<ReturnType<typeof parseSessionAnalysis>>;
}) {
  const hasRemarks = analysis.remarks.length > 0;
  const recommendation = analysis.recommendation?.trim() || null;
  if (!hasRemarks && !recommendation) {
    return null;
  }

  return (
    <div className="border-analysis-border/50 space-y-3 border-t pt-3">
      {hasRemarks ? (
        <div className="space-y-2">
          <p className="text-label text-foreground/70">Écarts au plan</p>
          <ul className="space-y-2">
            {analysis.remarks.map((remark) => (
              <li key={remark} className="text-foreground/85 text-sm leading-snug text-pretty">
                {remark}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recommendation ? (
        <div className="bg-muted/35 rounded-lg px-2.5 py-2">
          <p className="text-label text-foreground/70 mb-1">À faire</p>
          <p className="text-foreground text-sm leading-snug text-pretty">{recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}

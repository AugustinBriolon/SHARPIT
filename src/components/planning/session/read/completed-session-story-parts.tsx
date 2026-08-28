'use client';

import {
  parseSessionAnalysis,
  SESSION_VERDICT_LABELS,
  sessionScoreColor,
} from '@/lib/planned-session/display/session-analysis-display';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function ComplianceBadge({
  analysis,
  isAnalyzing,
}: {
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
}) {
  if (analysis) {
    return (
      <span
        aria-label={`Conformité au plan : ${analysis.complianceScore} sur 100, ${SESSION_VERDICT_LABELS[analysis.verdict]}`}
        className={cn(
          'text-data inline-flex items-baseline gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums',
          'border-analysis-border/70 bg-background/70',
        )}
      >
        <span className={sessionScoreColor(analysis.complianceScore)}>
          {analysis.complianceScore}
        </span>
        <span className="text-muted-foreground font-normal">/100</span>
        <span className="text-muted-foreground mx-0.5 font-normal">·</span>
        <span className="text-foreground/80 font-medium">
          {SESSION_VERDICT_LABELS[analysis.verdict]}
        </span>
      </span>
    );
  }

  if (!isAnalyzing) {
    return null;
  }

  return (
    <span
      title="Analyse de conformité"
      className={cn(
        'text-data inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        'border-analysis-border/70 bg-background/70 text-muted-foreground',
      )}
    >
      <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" aria-hidden />
      Analyse…
    </span>
  );
}

export function CompletedSessionPlanGaps({
  analysis,
}: {
  analysis: NonNullable<ReturnType<typeof parseSessionAnalysis>>;
}) {
  const hasRemarks = analysis.remarks.length > 0;
  const hasRecommendation = Boolean(analysis.recommendation?.trim());
  if (!hasRemarks && !hasRecommendation) {
    return null;
  }

  return (
    <div className="space-y-2 px-3 py-2.5">
      <p className="text-label">Écarts au plan</p>
      {hasRemarks ? (
        <ul className="space-y-1">
          {analysis.remarks.map((remark) => (
            <li key={remark} className="text-muted-foreground flex gap-1.5 text-xs leading-snug">
              <span className="text-primary mt-0.5" aria-hidden>
                ·
              </span>
              <span>{remark}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasRecommendation ? (
        <div className="border-analysis-border/50 bg-background/70 space-y-1 rounded-md border px-2.5 py-2">
          <p className="text-label">Orientation</p>
          <p className="text-foreground/85 text-xs leading-relaxed">{analysis.recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import {
  parseSessionAnalysis,
  SESSION_VERDICT_LABELS,
  sessionScoreColor,
} from '@/lib/planned-session/display/session-analysis-display';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const CHIP_SHELL =
  'text-data inline-flex max-w-full min-h-7 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition-[color,background-color,border-color] duration-150 ease-out';

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
        role="status"
        className={cn(
          CHIP_SHELL,
          'border-analysis-border/70 bg-background/70 font-semibold tabular-nums',
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
      aria-busy="true"
      aria-live="polite"
      className={cn(CHIP_SHELL, 'border-analysis-border/70 bg-background/70 text-muted-foreground')}
      role="status"
    >
      <Loader2
        className="text-primary size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
        aria-hidden
      />
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
    <div className="space-y-2">
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
        <p className="text-foreground/85 text-xs leading-relaxed text-pretty">
          {analysis.recommendation}
        </p>
      ) : null}
    </div>
  );
}

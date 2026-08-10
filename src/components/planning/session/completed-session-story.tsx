'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { Button } from '@/components/ui/button';
import {
  parseSessionAnalysis,
  SESSION_VERDICT_LABELS,
  sessionScoreColor,
} from '@/lib/planned-session/session-analysis-display';
import type { ClientPlannedSession } from '@/lib/query/types';
import { activityNarrativeSchema } from '@/lib/validators/coach';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useOfflineGuard } from '@/hooks/use-offline-guard';

function parseActivityNarrative(raw: unknown) {
  const parsed = activityNarrativeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function ReanalyzeButtonIcon({
  analyzing,
  hasAnalysis,
}: {
  analyzing: boolean;
  hasAnalysis: boolean;
}) {
  if (analyzing) return <Loader2 className="size-3.5 animate-spin" />;
  if (hasAnalysis) return <RefreshCw className="size-3.5" />;
  return <Sparkles className="size-3.5" />;
}

/**
 * One coach reading for a completed planned session.
 * Compliance is a status chip — not a second essay competing with the activity narrative.
 */
export function CompletedSessionStory({
  session,
  isAnalyzing = false,
  onReanalyze,
}: {
  session: ClientPlannedSession;
  isAnalyzing?: boolean;
  onReanalyze?: () => void;
}) {
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const { activity } = session;
  const analysis = parseSessionAnalysis(session.analysis);
  const narrative =
    activity?.narrativeAnalyzedAt != null
      ? parseActivityNarrative(activity.narrativeAnalysis)
      : null;
  const notes = activity?.notes?.trim() || null;

  const hasStory = Boolean(narrative || analysis || notes);
  if (!hasStory && !isAnalyzing && !onReanalyze) return null;

  const primaryHeadline = narrative?.headline ?? null;
  const primaryBody = narrative?.narrative ?? analysis?.summary ?? null;
  const showPlanGaps =
    analysis != null &&
    (analysis.remarks.length > 0 || Boolean(analysis.recommendation?.trim())) &&
    // When narrative carries the story, keep plan gaps as secondary evidence only.
    true;

  return (
    <section
      aria-label="Lecture de la séance"
      className="bg-analysis-surface-alt rounded-analysis-lg min-w-0 space-y-3 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label inline-flex items-center gap-2">
          <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
          Lecture de la séance
        </p>
        {analysis ? (
          <span
            title="Conformité au plan"
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
        ) : null}
      </div>

      {isAnalyzing && !hasStory ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
          Lecture en cours…
        </div>
      ) : null}

      {primaryHeadline ? (
        <h3 className="text-verdict text-foreground leading-snug">{primaryHeadline}</h3>
      ) : null}

      {primaryBody ? (
        <p className="text-foreground/90 text-sm leading-relaxed">{primaryBody}</p>
      ) : null}

      {notes ? (
        <div className="border-analysis-border/50 min-w-0 space-y-1 border-t pt-3">
          <p className="text-label">Note</p>
          <p className="text-foreground/85 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
            {notes}
          </p>
        </div>
      ) : null}

      {showPlanGaps && analysis ? (
        <div className="border-analysis-border/50 space-y-2 border-t pt-3">
          <p className="text-label">Écarts au plan</p>
          {analysis.remarks.length > 0 ? (
            <ul className="space-y-1">
              {analysis.remarks.map((remark) => (
                <li
                  key={remark}
                  className="text-muted-foreground flex gap-1.5 text-xs leading-snug"
                >
                  <span className="text-primary mt-0.5" aria-hidden>
                    ·
                  </span>
                  <span>{remark}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {analysis.recommendation?.trim() ? (
            <p className="border-primary/25 bg-primary/5 text-foreground/90 rounded-md border px-2.5 py-2 text-xs leading-relaxed">
              {analysis.recommendation}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <DiscussWithCoachButton
          size="sm"
          target={{ kind: 'planned-session', sessionId: session.id }}
        />
        {onReanalyze ? (
          <Button
            disabled={guardDisabled || isAnalyzing}
            size="sm"
            type="button"
            variant={analysis ? 'ghost' : 'outline'}
            onClick={onReanalyze}
          >
            <ReanalyzeButtonIcon analyzing={isAnalyzing} hasAnalysis={Boolean(analysis)} />
            {isAnalyzing
              ? 'Analyse…'
              : offline
                ? offlineLabel
                : analysis
                  ? 'Recalculer la conformité'
                  : 'Analyser la conformité'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

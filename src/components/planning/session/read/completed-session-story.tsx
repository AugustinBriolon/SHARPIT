'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { Button } from '@/components/ui/button';
import {
  parseSessionAnalysis,
  SESSION_VERDICT_LABELS,
  sessionScoreColor,
} from '@/lib/planned-session/display/session-analysis-display';
import type { ClientPlannedSession } from '@/lib/query/types';
import { activityNarrativeSchema } from '@/lib/validators/coach';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw } from 'lucide-react';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';

function parseActivityNarrative(raw: unknown) {
  const parsed = activityNarrativeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function ReanalyzeButtonIcon({ analyzing }: { analyzing: boolean }) {
  if (analyzing) return <Loader2 className="size-3.5 animate-spin" />;
  return <RefreshCw className="size-3.5" />;
}

function renderComplianceBadge(
  analysis: ReturnType<typeof parseSessionAnalysis>,
  isAnalyzing: boolean,
) {
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

  if (!isAnalyzing) return null;

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
  const primaryBody =
    narrative?.narrative ?? (analysis && !isAnalyzing ? analysis.summary : null) ?? null;
  const showPlanGaps =
    analysis != null && (analysis.remarks.length > 0 || Boolean(analysis.recommendation?.trim()));

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
        {renderComplianceBadge(analysis, isAnalyzing)}
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
            <div className="border-analysis-border/50 bg-analysis-surface-alt/80 space-y-1 rounded-md border px-2.5 py-2">
              <p className="text-label">Orientation</p>
              <p className="text-foreground/85 text-xs leading-relaxed">
                {analysis.recommendation}
              </p>
            </div>
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
            <ReanalyzeButtonIcon analyzing={isAnalyzing} />
            {guardedActionLabel(
              offline,
              offlineLabel,
              analysis ? 'Recalculer la conformité' : 'Analyser la conformité',
              { active: isAnalyzing, label: 'Analyse…' },
            )}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

'use client';

import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';
import { activityNarrativeSchema } from '@/lib/validators/coach';
import { sanitizeCoachCopy } from '@/lib/coach/sanitize-coach-copy';
import { GitCompare } from 'lucide-react';
import { CompletedSessionPlanGaps } from '@/components/planning/session/read/completed-session-story-parts';
import { CollapsibleSection } from '@/components/ui/collapsible-section';

function parseActivityNarrative(raw: unknown) {
  const parsed = activityNarrativeSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  return {
    headline: sanitizeCoachCopy(parsed.data.headline),
    narrative: sanitizeCoachCopy(parsed.data.narrative),
  };
}

function StoryHeadline({ headline }: { headline: string }) {
  return (
    <p className="text-foreground text-sm leading-snug font-semibold text-pretty">{headline}</p>
  );
}

function StoryBody({ body }: { body: string }) {
  return <p className="text-foreground/90 text-sm leading-relaxed text-pretty">{body}</p>;
}

function resolvePrimaryBody({
  narrative,
  analysis,
  isAnalyzing,
}: {
  narrative: ReturnType<typeof parseActivityNarrative>;
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
}) {
  if (narrative?.narrative) {
    return narrative.narrative;
  }
  if (analysis && !isAnalyzing) {
    return analysis.summary;
  }
  return null;
}

function StoryNarrativeBlock({
  narrative,
  analysis,
  isAnalyzing,
}: {
  narrative: ReturnType<typeof parseActivityNarrative>;
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
}) {
  const primaryHeadline = narrative?.headline ?? null;
  const primaryBody = resolvePrimaryBody({ narrative, analysis, isAnalyzing });

  return (
    <>
      {primaryHeadline ? <StoryHeadline headline={primaryHeadline} /> : null}
      {primaryBody ? <StoryBody body={primaryBody} /> : null}
    </>
  );
}

export function CompletedSessionStoryContent({
  narrative,
  analysis,
  isAnalyzing,
}: {
  narrative: ReturnType<typeof parseActivityNarrative>;
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
  notes?: string | null;
}) {
  // Loading chrome lives only on ComplianceBadge — avoid a second spinner here.
  return (
    <StoryNarrativeBlock analysis={analysis} isAnalyzing={isAnalyzing} narrative={narrative} />
  );
}

function hasPlanGaps(analysis: ReturnType<typeof parseSessionAnalysis>): boolean {
  if (!analysis) {
    return false;
  }
  return analysis.remarks.length > 0 || Boolean(analysis.recommendation?.trim());
}

/** Plan gaps as a quiet disclosure — not a nested card stack. */
export function CompletedSessionDetails({
  analysis,
}: {
  analysis: ReturnType<typeof parseSessionAnalysis>;
}) {
  if (!hasPlanGaps(analysis) || !analysis) {
    return null;
  }

  const remarkCount = analysis.remarks.length;
  const summary =
    remarkCount > 0
      ? `${remarkCount} point${remarkCount > 1 ? 's' : ''}`
      : analysis.recommendation
        ? 'Orientation'
        : null;

  return (
    <CollapsibleSection
      defaultOpen={false}
      icon={GitCompare}
      label="Écarts au plan"
      summary={summary}
    >
      <CompletedSessionPlanGaps analysis={analysis} />
    </CollapsibleSection>
  );
}

/** @deprecated Prefer CompletedSessionAthleteCapture for editable notes. */
export function CompletedSessionNote({ notes }: { notes: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-label">Ta note</p>
      <p className="text-verdict text-foreground leading-snug wrap-break-word whitespace-pre-wrap">
        {notes}
      </p>
    </div>
  );
}

export { parseActivityNarrative, parseSessionAnalysis };

'use client';

import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';
import { activityNarrativeSchema } from '@/lib/validators/coach';
import { Loader2 } from 'lucide-react';
import { CompletedSessionPlanGaps } from '@/components/planning/session/read/completed-session-story-parts';

function parseActivityNarrative(raw: unknown) {
  const parsed = activityNarrativeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function StoryLoadingRow() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
      Lecture en cours…
    </div>
  );
}

function StoryHeadline({ headline }: { headline: string }) {
  return <h3 className="text-verdict text-foreground leading-snug">{headline}</h3>;
}

function StoryBody({ body }: { body: string }) {
  return <p className="text-foreground/90 text-sm leading-relaxed">{body}</p>;
}

function StoryNotes({ notes }: { notes: string }) {
  return (
    <div className="min-w-0 space-y-1 px-3 py-2.5">
      <p className="text-label">Ta note</p>
      <p className="text-foreground text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
        {notes}
      </p>
    </div>
  );
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
  notes,
}: {
  narrative: ReturnType<typeof parseActivityNarrative>;
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
  notes: string | null;
}) {
  const showLoading = isAnalyzing && !narrative && !analysis && !notes;

  return (
    <>
      {showLoading ? <StoryLoadingRow /> : null}
      <StoryNarrativeBlock analysis={analysis} isAnalyzing={isAnalyzing} narrative={narrative} />
    </>
  );
}

function hasPlanGaps(analysis: ReturnType<typeof parseSessionAnalysis>): boolean {
  if (!analysis) {
    return false;
  }
  return analysis.remarks.length > 0 || Boolean(analysis.recommendation?.trim());
}

/**
 * "Ta note" + "Écarts au plan" grouped under one boundary instead of each
 * managing its own top hairline — reads as one supporting-detail block under
 * the narrative, not a loose stack of same-weight fragments.
 */
export function CompletedSessionDetails({
  notes,
  analysis,
}: {
  notes: string | null;
  analysis: ReturnType<typeof parseSessionAnalysis>;
}) {
  const showPlanGaps = hasPlanGaps(analysis);
  if (!notes && !showPlanGaps) {
    return null;
  }

  return (
    <div className="border-analysis-border/60 divide-analysis-border/50 min-w-0 divide-y overflow-hidden rounded-md border">
      {notes ? <StoryNotes notes={notes} /> : null}
      {showPlanGaps && analysis ? <CompletedSessionPlanGaps analysis={analysis} /> : null}
    </div>
  );
}

export { parseActivityNarrative, parseSessionAnalysis };

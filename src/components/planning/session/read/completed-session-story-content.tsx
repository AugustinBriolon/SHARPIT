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
    <div className="border-analysis-border/50 min-w-0 space-y-1 border-t pt-3">
      <p className="text-label">Note</p>
      <p className="text-foreground/85 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
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

function StoryContentSections({
  showLoading,
  narrative,
  analysis,
  isAnalyzing,
  notes,
  showPlanGaps,
}: {
  showLoading: boolean;
  narrative: ReturnType<typeof parseActivityNarrative>;
  analysis: ReturnType<typeof parseSessionAnalysis>;
  isAnalyzing: boolean;
  notes: string | null;
  showPlanGaps: boolean;
}) {
  return (
    <>
      {showLoading ? <StoryLoadingRow /> : null}
      <StoryNarrativeBlock analysis={analysis} isAnalyzing={isAnalyzing} narrative={narrative} />
      {notes ? <StoryNotes notes={notes} /> : null}
      {showPlanGaps && analysis ? <CompletedSessionPlanGaps analysis={analysis} /> : null}
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
  const showPlanGaps =
    analysis !== null && (analysis.remarks.length > 0 || Boolean(analysis.recommendation?.trim()));

  return (
    <StoryContentSections
      analysis={analysis}
      isAnalyzing={isAnalyzing}
      narrative={narrative}
      notes={notes}
      showLoading={showLoading}
      showPlanGaps={showPlanGaps}
    />
  );
}

export { parseActivityNarrative, parseSessionAnalysis };

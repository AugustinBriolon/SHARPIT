'use client';

import { parseSessionAnalysis } from '@sharpit/server/lib/planned-session/display/session-analysis-display';
import { activityNarrativeSchema } from '@sharpit/server/lib/validators/coach';
import { sanitizeCoachCopy } from '@sharpit/server/lib/coach/sanitize-coach-copy';

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
  return <p className="text-verdict text-foreground leading-snug text-pretty">{headline}</p>;
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

  if (!primaryHeadline && !primaryBody) {
    return null;
  }

  return (
    <div className="space-y-2">
      {primaryHeadline ? <StoryHeadline headline={primaryHeadline} /> : null}
      {primaryBody ? <StoryBody body={primaryBody} /> : null}
    </div>
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
  return (
    <StoryNarrativeBlock analysis={analysis} isAnalyzing={isAnalyzing} narrative={narrative} />
  );
}

/** @deprecated Prefer CompletedSessionAthleteNote. */
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

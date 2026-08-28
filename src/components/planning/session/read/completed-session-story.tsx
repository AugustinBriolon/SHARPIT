'use client';

import type { ClientPlannedSession } from '@/lib/query/types';
import {
  CompletedSessionStoryContent,
  parseActivityNarrative,
  parseSessionAnalysis,
} from '@/components/planning/session/read/completed-session-story-content';
import { ComplianceBadge } from '@/components/planning/session/read/completed-session-story-parts';
import { CompletedSessionStoryActions } from '@/components/planning/session/read/completed-session-story-actions';

function readActivityNarrative(activity: ClientPlannedSession['activity']) {
  if (!activity) {
    return null;
  }
  if (activity.narrativeAnalyzedAt === null || activity.narrativeAnalyzedAt === undefined) {
    return null;
  }
  return parseActivityNarrative(activity.narrativeAnalysis);
}

function readActivityNotes(activity: ClientPlannedSession['activity']) {
  return activity?.notes?.trim() || null;
}

function parseSessionStory(session: ClientPlannedSession) {
  const { activity, analysis: analysisRaw } = session;
  const analysis = parseSessionAnalysis(analysisRaw);
  const narrative = readActivityNarrative(activity);
  const notes = readActivityNotes(activity);
  const hasStory = Boolean(narrative || analysis || notes);
  return { analysis, narrative, notes, hasStory };
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
  const { analysis, narrative, notes, hasStory } = parseSessionStory(session);
  if (!hasStory && !isAnalyzing && !onReanalyze) {
    return null;
  }

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
        <ComplianceBadge analysis={analysis} isAnalyzing={isAnalyzing} />
      </div>

      <CompletedSessionStoryContent
        analysis={analysis}
        isAnalyzing={isAnalyzing}
        narrative={narrative}
        notes={notes}
      />

      <CompletedSessionStoryActions
        analysis={analysis}
        isAnalyzing={isAnalyzing}
        sessionId={session.id}
        onReanalyze={onReanalyze}
      />
    </section>
  );
}

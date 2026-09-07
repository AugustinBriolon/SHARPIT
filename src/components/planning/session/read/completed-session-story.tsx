'use client';

import type { ClientPlannedSession } from '@/lib/query/types';
import {
  CompletedSessionDetails,
  CompletedSessionStoryContent,
  parseActivityNarrative,
  parseSessionAnalysis,
} from '@/components/planning/session/read/completed-session-story-content';
import { ComplianceBadge } from '@/components/planning/session/read/completed-session-story-parts';
import { CompletedSessionStoryActions } from '@/components/planning/session/read/completed-session-story-actions';
import { CompletedSessionAthleteCapture } from '@/components/planning/session/read/completed-session-athlete-capture';
import { PlanSectionHeading } from '@/components/plan/hub/plan-section-heading';

function readActivityNarrative(activity: ClientPlannedSession['activity']) {
  if (!activity) {
    return null;
  }
  if (activity.narrativeAnalyzedAt === null || activity.narrativeAnalyzedAt === undefined) {
    return null;
  }
  return parseActivityNarrative(activity.narrativeAnalysis);
}

function parseSessionStory(session: ClientPlannedSession) {
  const { activity, analysis: analysisRaw } = session;
  const analysis = parseSessionAnalysis(analysisRaw);
  const narrative = readActivityNarrative(activity);
  const notes = activity?.notes?.trim() || null;
  const hasStory = Boolean(narrative || analysis || notes || activity);
  return { analysis, narrative, notes, hasStory, activity };
}

/**
 * SESSION_COMPLETED: capture first (hero), then coach lecture, then plan gaps.
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
  const { analysis, narrative, notes, hasStory, activity } = parseSessionStory(session);
  if (!hasStory && !isAnalyzing && !onReanalyze) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-6">
      {activity ? <CompletedSessionAthleteCapture activity={activity} /> : null}

      <section aria-labelledby="session-lecture" className="min-w-0 space-y-3">
        <PlanSectionHeading
          action={<ComplianceBadge analysis={analysis} isAnalyzing={isAnalyzing} />}
          heading="h3"
          id="session-lecture"
          title="Lecture"
        />

        <CompletedSessionStoryContent
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          narrative={narrative}
          notes={notes}
        />

        <CompletedSessionDetails analysis={analysis} />

        <CompletedSessionStoryActions
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          sessionId={session.id}
          onReanalyze={onReanalyze}
        />
      </section>
    </div>
  );
}

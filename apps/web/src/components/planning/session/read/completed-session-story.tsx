'use client';

import type { ClientPlannedSession } from '@sharpit/app/lib/query/types';
import {
  CompletedSessionStoryContent,
  parseActivityNarrative,
  parseSessionAnalysis,
} from '@/components/planning/session/read/completed-session-story-content';
import { CompletedSessionAthleteNote } from '@/components/planning/session/read/completed-session-athlete-capture';
import {
  CompletedSessionPlanGaps,
  ExecutionScoreBlock,
} from '@/components/planning/session/read/completed-session-story-parts';
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
  const hasStory = Boolean(narrative || analysis || activity?.notes?.trim() || activity);
  return { analysis, narrative, hasStory, activity };
}

/**
 * SESSION_COMPLETED plate (body): Lecture → score → récit → écarts → note.
 * Actions live in the modal header menu.
 */
export function CompletedSessionStory({
  session,
  isAnalyzing = false,
}: {
  session: ClientPlannedSession;
  isAnalyzing?: boolean;
}) {
  const { analysis, narrative, hasStory, activity } = parseSessionStory(session);
  if (!hasStory && !isAnalyzing) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-5">
      <section aria-labelledby="session-lecture" className="min-w-0 space-y-3">
        <PlanSectionHeading heading="h3" id="session-lecture" title="Lecture" />

        <ExecutionScoreBlock analysis={analysis} isAnalyzing={isAnalyzing} />

        <CompletedSessionStoryContent
          analysis={analysis}
          isAnalyzing={isAnalyzing}
          narrative={narrative}
        />

        {analysis ? <CompletedSessionPlanGaps analysis={analysis} /> : null}
      </section>

      {activity ? (
        <div className="border-analysis-border/40 border-t pt-3">
          <CompletedSessionAthleteNote activityId={activity.id} notes={activity.notes ?? null} />
        </div>
      ) : null}
    </div>
  );
}

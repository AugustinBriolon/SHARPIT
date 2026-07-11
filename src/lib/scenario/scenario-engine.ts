/**
 * Scenario Engine — orchestrates multiple projection runs.
 */

import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ScenarioComparison } from '@/core/scenario/types';
import {
  buildProjectionBaseContext,
  buildProjectedInputFromBase,
} from '@/lib/projection/build-projection-input';
import { aggregatePlanningMaps } from '@/lib/projection/planning-maps';
import { projectAthleteState } from '@/lib/projection/project-athlete-state';
import { pickFocusSession } from '@/lib/scenario/apply-modification';
import { compareScenarioProjections } from '@/lib/scenario/compare-scenarios';
import {
  generateScenariosFromDecision,
  resolveAnchorDecisionDomain,
} from '@/lib/scenario/generate-from-decision';

export async function runScenarioComparison(params?: {
  horizonDays?: ProjectionHorizonDays;
  anchorTrainingDayId?: string;
}): Promise<ScenarioComparison | null> {
  const context = await buildProjectionBaseContext(params);
  if (!context) return null;

  const { base, futureDayIds, sessionSlices, anchorDecision } = context;
  if (sessionSlices.length === 0) return null;

  const anchorDecisionDomain = resolveAnchorDecisionDomain(anchorDecision);
  const definitions = generateScenariosFromDecision(sessionSlices, futureDayIds, anchorDecision);
  const focus = pickFocusSession(sessionSlices);
  const focusLabel = focus?.title?.trim() || focus?.type || null;

  const scenarioRuns = definitions
    .map((definition) => {
      const input = buildProjectedInputFromBase(base, definition.modifiedSessions, futureDayIds);
      const projection = projectAthleteState(input);
      if (!projection) return null;
      const maps = aggregatePlanningMaps(futureDayIds, definition.modifiedSessions);
      return {
        definition,
        projection,
        environmentalImpactByDay: maps.environmentalImpactByDay,
      };
    })
    .filter((run): run is NonNullable<typeof run> => run != null);

  return compareScenarioProjections({
    athleteId: base.athleteId,
    anchorTrainingDayId: base.anchorTrainingDayId,
    horizonDays: base.horizonDays,
    focusSessionId: focus?.sessionId ?? null,
    focusSessionLabel: focusLabel,
    anchorDecisionDomain,
    scenarios: scenarioRuns,
  });
}

/**
 * Scenario Engine — orchestrates multiple projection runs.
 */

import type { ProjectionHorizonDays } from '@/core/projection/types';
import { isSet } from '@/lib/util/value';
import type { ScenarioComparison, ScenarioDefinition } from '@/core/scenario/types';
import {
  buildProjectionBaseContext,
  buildProjectedInputFromBase,
  type ProjectionBaseContext,
} from '@/lib/projection/build-projection-input';
import { aggregatePlanningMaps } from '@/lib/projection/planning-maps';
import { projectAthleteState } from '@/lib/projection/project-athlete-state';
import { pickFocusSession } from '@/lib/scenario/apply-modification';
import { compareScenarioProjections } from '@/lib/scenario/compare-scenarios';
import {
  generateScenariosFromDecision,
  resolveAnchorDecisionDomain,
} from '@/lib/scenario/generate-from-decision';

function runScenarioProjection(
  definition: ScenarioDefinition,
  base: ProjectionBaseContext,
  futureDayIds: readonly string[],
) {
  const input = buildProjectedInputFromBase(base, definition.modifiedSessions, futureDayIds);
  const projection = projectAthleteState(input);
  if (!projection) {
    return null;
  }
  const maps = aggregatePlanningMaps(futureDayIds, definition.modifiedSessions);
  return {
    definition,
    projection,
    environmentalImpactByDay: maps.environmentalImpactByDay,
  };
}

function focusSessionLabel(focus: ReturnType<typeof pickFocusSession>): string | null {
  if (!focus) {
    return null;
  }
  const title = focus.title?.trim();
  return title || focus.type || null;
}

export async function runScenarioComparison(
  athleteId: string,
  params?: {
    horizonDays?: ProjectionHorizonDays;
    anchorTrainingDayId?: string;
  },
): Promise<ScenarioComparison | null> {
  const context = await buildProjectionBaseContext(athleteId, params);
  if (!context || context.sessionSlices.length === 0) {
    return null;
  }

  const { base, futureDayIds, sessionSlices, anchorDecision } = context;
  const definitions = generateScenariosFromDecision(sessionSlices, futureDayIds, anchorDecision);
  const focus = pickFocusSession(sessionSlices);

  const scenarioRuns = definitions
    .map((definition) => runScenarioProjection(definition, base, futureDayIds))
    .filter((run): run is NonNullable<typeof run> => isSet(run));

  return compareScenarioProjections({
    athleteId: base.athleteId,
    anchorTrainingDayId: base.anchorTrainingDayId,
    horizonDays: base.horizonDays,
    focusSessionId: focus?.sessionId ?? null,
    focusSessionLabel: focusSessionLabel(focus),
    anchorDecisionDomain: resolveAnchorDecisionDomain(anchorDecision),
    scenarios: scenarioRuns,
  });
}

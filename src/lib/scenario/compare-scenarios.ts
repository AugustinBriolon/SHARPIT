/**
 * Scenario comparison — explains differences between Decision Engine outputs.
 *
 * No product scoring. No arbitration. Orchestration + explanation only.
 */

import type { TrainingEnvironmentalImpact } from '@/core/inference/environment/types';
import type { DecisionDomain } from '@/core/decision/decision-state';
import type { ProjectedAthleteState } from '@/core/projection/types';
import {
  SCENARIO_MODEL_ID,
  type ScenarioComparison,
  type ScenarioComparisonEntry,
  type ScenarioDefinition,
  type ScenarioOutcomeMetrics,
} from '@/core/scenario/types';
import {
  buildDecisionTradeOffs,
  buildPreferabilityExplanation,
  compareDecisionSnapshots,
  COMPARISON_METHOD,
  computeDecisionDelta,
} from '@/lib/scenario/decision-comparison';
import { extractScenarioDecisionSnapshot } from '@/lib/scenario/decision-snapshot';
import { maxImpactAcrossDays } from '@/lib/projection/planning-maps';

function lastProjectedDay(state: ProjectedAthleteState) {
  return state.days[state.days.length - 1];
}

function endDayPhysiology(state: ProjectedAthleteState) {
  const last = lastProjectedDay(state);
  if (!last) {
    return {
      endReadiness: null,
      endFatigue: null,
      endAdaptation: null,
      endTsb: null,
    };
  }
  return {
    endReadiness: last.physiology.expectedReadiness,
    endFatigue: last.physiology.expectedFatigueIndex,
    endAdaptation: last.physiology.expectedAdaptationIndex,
    endTsb: last.load.tsb,
  };
}

export function extractOutcomeMetrics(
  state: ProjectedAthleteState,
  environmentalImpactByDay: ReadonlyMap<string, TrainingEnvironmentalImpact>,
): ScenarioOutcomeMetrics {
  return {
    ...endDayPhysiology(state),
    maxEnvironmentalImpact: maxImpactAcrossDays(environmentalImpactByDay),
  };
}

function buildScenarioComparisonEntry(
  definition: ScenarioDefinition,
  projection: ProjectedAthleteState,
  environmentalImpactByDay: ReadonlyMap<string, TrainingEnvironmentalImpact>,
  baselineDecision: ReturnType<typeof extractScenarioDecisionSnapshot>,
): ScenarioComparisonEntry {
  const decision = extractScenarioDecisionSnapshot(projection);
  const decisionDeltaVsBaseline = computeDecisionDelta(decision, baselineDecision);
  const compare = compareDecisionSnapshots(decision, baselineDecision);
  const isPreferredOverBaseline = definition.kind !== 'KEEP_PLAN' && compare > 0;

  return {
    scenarioId: definition.id,
    kind: definition.kind,
    label: definition.label,
    rationale: definition.rationale,
    targetSessionId: definition.targetSessionId,
    triggeredByDomain: definition.triggeredByDomain,
    decision,
    decisionDeltaVsBaseline,
    outcome: extractOutcomeMetrics(projection, environmentalImpactByDay),
    tradeOffs: buildDecisionTradeOffs(decisionDeltaVsBaseline),
    preferabilityExplanation: buildPreferabilityExplanation(
      decisionDeltaVsBaseline,
      decision,
      baselineDecision,
    ),
    isPreferredOverBaseline,
    projection,
  };
}

export function compareScenarioProjections(input: {
  athleteId: string;
  anchorTrainingDayId: string;
  horizonDays: ScenarioComparison['horizonDays'];
  focusSessionId: string | null;
  focusSessionLabel: string | null;
  anchorDecisionDomain: DecisionDomain | null;
  scenarios: readonly {
    definition: ScenarioDefinition;
    projection: ProjectedAthleteState;
    environmentalImpactByDay: ReadonlyMap<string, TrainingEnvironmentalImpact>;
  }[];
}): ScenarioComparison | null {
  if (input.scenarios.length === 0) {
    return null;
  }

  const baselineEntry = input.scenarios.find((s) => s.definition.kind === 'KEEP_PLAN');
  if (!baselineEntry) {
    return null;
  }

  const baselineDecision = extractScenarioDecisionSnapshot(baselineEntry.projection);

  const entries: ScenarioComparisonEntry[] = input.scenarios.map(
    ({ definition, projection, environmentalImpactByDay }) =>
      buildScenarioComparisonEntry(
        definition,
        projection,
        environmentalImpactByDay,
        baselineDecision,
      ),
  );

  const alternatives = entries.filter((e) => e.kind !== 'KEEP_PLAN' && e.isPreferredOverBaseline);
  const bestAlternative =
    alternatives.length > 0
      ? [...alternatives].sort((a, b) => compareDecisionSnapshots(b.decision, a.decision))[0]
      : null;

  const recommendedScenarioId = bestAlternative?.scenarioId ?? baselineEntry.definition.id;
  const recommended = entries.find((e) => e.scenarioId === recommendedScenarioId)!;
  const isBaseline = recommended.kind === 'KEEP_PLAN';

  const recommendation = isBaseline
    ? 'Le plan actuel reste le meilleur compromis selon le Decision Engine.'
    : `Préférer « ${recommended.label} »`;

  const recommendationRationale = isBaseline
    ? 'Aucune alternative ne produit une sortie Decision Engine strictement préférable (comparaison lexicographique).'
    : recommended.preferabilityExplanation;

  return {
    modelId: SCENARIO_MODEL_ID,
    athleteId: input.athleteId,
    anchorTrainingDayId: input.anchorTrainingDayId,
    horizonDays: input.horizonDays,
    focusSessionId: input.focusSessionId,
    focusSessionLabel: input.focusSessionLabel,
    anchorDecisionDomain: input.anchorDecisionDomain,
    computedAt: new Date().toISOString(),
    baselineScenarioId: baselineEntry.definition.id,
    recommendedScenarioId,
    recommendation,
    recommendationRationale,
    comparisonMethod: COMPARISON_METHOD,
    scenarios: entries,
  };
}

export { COMPARISON_METHOD };

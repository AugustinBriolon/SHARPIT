/**
 * REASONING ENGINE v1 — Model Entry Point
 *
 * Delegates cross-model synthesis to the canonical Decision Engine (decision-v1).
 * ReasoningState is a backward-compatible projection of DecisionState.
 */

import { runDecisionEngine, decisionStateToReasoningState } from '@/core/decision';
import { buildEnvironmentalDecisionSnapshotFromParts } from '@/core/inference/environment/snapshot';
import { buildModelDirections } from './scoring';
import type { ReasoningModelInput, ReasoningModelOutput, ReasoningSignals } from './types';

export function runReasoningModel(input: ReasoningModelInput): ReasoningModelOutput {
  const { trainingDayId, athleteId, athleteState } = input;
  const { recovery, fatigue, adaptation, physicalHealth, environmental } = athleteState;

  const environmentSnapshot =
    environmental != null
      ? buildEnvironmentalDecisionSnapshotFromParts({
          stress: environmental.stress,
          impact: environmental.impact,
          confidence: environmental.meta.confidence,
          computedAt: environmental.meta.computedAt,
        })
      : null;

  const { decisionState, signals } = runDecisionEngine({
    trainingDayId,
    athleteId,
    recovery,
    fatigue,
    adaptation,
    physicalHealth: physicalHealth ?? null,
    environment: environmentSnapshot,
    environmentalImpact: environmental?.impact ?? null,
  });

  const reasoningState = decisionStateToReasoningState(decisionState);
  const modelDirections = buildModelDirections(recovery, fatigue, adaptation);

  const reasoningSignals: ReasoningSignals = {
    overallVerdict: decisionState.overallVerdict,
    physiologicalConsistency: decisionState.physiologicalConsistency,
    consistencyScore: decisionState.consistencyScore,
    availableModelCount: signals.availableModelCount,
    modelDirections,
    conflictCount: signals.conflictCount,
    opportunityCount: decisionState.opportunities.length,
    keyFindingCount: decisionState.supportingEvidence.length,
    hasRecoveryState: signals.hasRecoveryState,
    hasFatigueState: signals.hasFatigueState,
    hasAdaptationState: signals.hasAdaptationState,
  };

  return {
    signals: reasoningSignals,
    reasoningState,
    decisionState,
  };
}

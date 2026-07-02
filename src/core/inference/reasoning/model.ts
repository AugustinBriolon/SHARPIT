/**
 * REASONING ENGINE v1 — Model Entry Point
 *
 * Pure function. Orchestrates all scoring functions from scoring.ts
 * into a complete ReasoningModelOutput.
 *
 * No side effects, no DB calls, no feature fetching.
 * The Reasoning Engine reads exclusively from AthleteState (Digital Twin).
 */

import type { ReasoningModelInput, ReasoningModelOutput, ReasoningSignals } from './types';
import type { ReasoningState } from '@/core/digital-twin/types';
import {
  buildModelDirections,
  computeConsistency,
  synthesizeVerdict,
  detectConflicts,
  detectOpportunities,
  buildKeyFindings,
  selectLimitingFactor,
  selectAttentionPriority,
  buildTopAction,
  buildEvidenceGraph,
  computeReasoningConfidence,
} from './scoring';
import { generateReasoningExplanation } from './explanation';

export function runReasoningModel(input: ReasoningModelInput): ReasoningModelOutput {
  const { trainingDayId, athleteId, athleteState } = input;
  const { recovery: r, fatigue: f, adaptation: a } = athleteState;

  const availableCount = [r, f, a].filter(Boolean).length;

  // Step 1 — direction mapping + consistency
  const modelDirections = buildModelDirections(r, f, a);
  const { consistency: physiologicalConsistency, score: consistencyScore } =
    computeConsistency(modelDirections);

  // Step 2 — verdict (safety-first)
  const overallVerdict = synthesizeVerdict(r, f, a, availableCount);

  // Step 3 — conflicts + opportunities
  const conflicts = detectConflicts(r, f, a);
  const opportunities = detectOpportunities(r, f, a);

  // Step 4 — key findings
  const keyFindings = buildKeyFindings(r, f, a, conflicts);

  // Step 5 — limiting factor + attention priority
  const limitingFactor = selectLimitingFactor(r, f, a, overallVerdict);
  const systemAttentionPriority = selectAttentionPriority(limitingFactor, overallVerdict);

  // Step 6 — top action
  const topAction = buildTopAction(overallVerdict, limitingFactor, a);

  // Step 7 — evidence graph
  const evidenceGraph = buildEvidenceGraph(r, f, a, overallVerdict, limitingFactor);

  // Step 8 — confidence + data completeness
  const { confidence, dataCompleteness } = computeReasoningConfidence(
    r,
    f,
    a,
    physiologicalConsistency,
  );

  // Step 9 — build signals (ephemeral, not persisted)
  const signals: ReasoningSignals = {
    overallVerdict,
    physiologicalConsistency,
    consistencyScore,
    availableModelCount: availableCount,
    modelDirections,
    conflictCount: conflicts.length,
    opportunityCount: opportunities.length,
    keyFindingCount: keyFindings.length,
    hasRecoveryState: r !== null,
    hasFatigueState: f !== null,
    hasAdaptationState: a !== null,
  };

  // Step 10 — build ReasoningState (persisted to Digital Twin)
  const reasoningState: ReasoningState = {
    overallVerdict,
    systemAttentionPriority,
    physiologicalConsistency,
    consistencyScore,
    keyFindings,
    limitingFactor,
    opportunities,
    conflicts,
    topAction,
    evidenceGraph,
    confidence,
    dataCompleteness,
    modelId: 'reasoning-v1',
    computedAt: new Date(),
    trainingDayId,
  };

  // Step 11 — explanation
  const explanation = generateReasoningExplanation(reasoningState, signals, athleteId);

  return {
    signals,
    reasoningState,
    explanation,
  };
}

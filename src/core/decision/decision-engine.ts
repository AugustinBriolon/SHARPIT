/**
 * Decision Engine — canonical orchestration entry point.
 *
 * Transforms independent physiological model outputs into one coherent DecisionState.
 * Does not perform physiological inference.
 */

import {
  buildEvidenceGraph,
  buildKeyFindings,
  buildModelDirections,
  computeConsistency,
  computeReasoningConfidence,
  detectConflicts,
  detectOpportunities,
} from '@/core/inference/reasoning/scoring';
import type { ReasoningState } from '@/core/digital-twin/types';
import {
  arbitrateLimitingFactor,
  buildPrimaryDecision,
  synthesizeCanonicalVerdict,
} from './arbitration';
import { detectDecisionConflicts, resolveDecisionConflicts } from './conflict-resolution';
import type { DecisionEngineInput, DecisionEngineOutput, DecisionState } from './decision-state';
import { DECISION_ENGINE_VERSION } from './decision-state';
import { rankAndSuppressEvidence } from './evidence-ranking';
import {
  resolveAttentionDomain,
  resolveConfidenceTier,
  shouldGateAdvice,
  toSystemAttentionPriority,
} from './priority';

export function runDecisionEngine(input: DecisionEngineInput): DecisionEngineOutput {
  const {
    trainingDayId,
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
    environment,
    environmentalImpact,
    freshnessConfidence,
  } = input;

  const modelDirections = buildModelDirections(recovery, fatigue, adaptation);
  const { consistency: physiologicalConsistency, score: consistencyScore } =
    computeConsistency(modelDirections);

  const { verdict: overallVerdict, safetyOverrideApplied } = synthesizeCanonicalVerdict({
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
    environment,
  });

  const reasoningConflicts = detectConflicts(recovery, fatigue, adaptation);
  const decisionConflicts = detectDecisionConflicts({
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
  });

  const limitingFactor = arbitrateLimitingFactor({
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
    environment,
    verdict: overallVerdict,
  });

  const legacyLimiting: ReasoningState['limitingFactor'] = {
    system: limitingFactor.system === 'PHYSICAL_HEALTH' ? null : limitingFactor.system,
    description: limitingFactor.description,
    actionable: limitingFactor.actionable,
  };

  const rawFindings = buildKeyFindings(
    recovery,
    fatigue,
    adaptation,
    reasoningConflicts,
    modelDirections,
    physiologicalConsistency,
    overallVerdict,
    legacyLimiting,
  );

  const { supportingEvidence, suppressedEvidence, explanationOrder } = rankAndSuppressEvidence({
    findings: rawFindings,
    environmentalImpact: environmentalImpact ?? null,
    environmentSnapshot: environment,
  });

  const conflicts = resolveDecisionConflicts({
    conflicts: decisionConflicts,
    limitingFactor,
    modelDirections,
    verdict: overallVerdict,
    baseConflicts: reasoningConflicts,
  });

  const opportunities = detectOpportunities(recovery, fatigue, adaptation);
  const primaryDecision = buildPrimaryDecision({
    verdict: overallVerdict,
    limitingFactor,
    adaptation,
  });

  const topAction: ReasoningState['topAction'] = {
    verbCode: primaryDecision.verbCode,
    focusCode: primaryDecision.focusCode,
    rationaleCode: primaryDecision.rationaleCode,
    expectedBenefit: primaryDecision.expectedBenefit,
  };

  const evidenceGraph = buildEvidenceGraph(
    recovery,
    fatigue,
    adaptation,
    overallVerdict,
    legacyLimiting,
  );

  const { confidence: modelConfidence, dataCompleteness } = computeReasoningConfidence(
    recovery,
    fatigue,
    adaptation,
    physiologicalConsistency,
  );

  const freshnessFactor =
    freshnessConfidence != null ? Math.min(1, Math.max(0, freshnessConfidence)) : 1;
  const confidence = Math.round(modelConfidence * freshnessFactor * 100) / 100;
  const confidenceGated = shouldGateAdvice(confidence, overallVerdict);
  const attentionDomain = resolveAttentionDomain(limitingFactor, overallVerdict);

  const decisionState: DecisionState = {
    primaryDecision,
    limitingFactor,
    supportingEvidence,
    suppressedEvidence,
    confidence,
    confidenceTier: resolveConfidenceTier(confidence),
    dataCompleteness,
    conflicts,
    priority: {
      attentionDomain,
      safetyOverrideApplied,
      confidenceGated,
    },
    explanationOrder,
    overallVerdict,
    systemAttentionPriority: toSystemAttentionPriority(attentionDomain),
    physiologicalConsistency,
    consistencyScore,
    opportunities,
    topAction: confidenceGated ? null : topAction,
    evidenceGraph,
    modelId: DECISION_ENGINE_VERSION,
    computedAt: new Date(),
    trainingDayId,
  };

  const availableModelCount = [recovery, fatigue, adaptation, physicalHealth, environment].filter(
    Boolean,
  ).length;

  return {
    decisionState,
    signals: {
      availableModelCount,
      hasRecoveryState: recovery != null,
      hasFatigueState: fatigue != null,
      hasAdaptationState: adaptation != null,
      hasPhysicalHealthState: physicalHealth != null,
      hasEnvironmentState: environment != null,
      conflictCount: conflicts.length,
      suppressedEvidenceCount: suppressedEvidence.length,
    },
  };
}

/**
 * PHYSICAL HEALTH MODEL v1 — Inference Function
 *
 * Pure entry point. No I/O. Deterministic.
 * Model ID: 'physical-health-v1'
 */

import type { PhysicalHealthModelContext, PhysicalHealthModelOutput } from './types';
import {
  buildPhysicalHealthDecision,
  buildPhysicalHealthRecommendation,
  buildPhysicalHealthSignals,
  classifyDataCompleteness,
  computeAggregateConfidence,
  findPrimaryLimitingCondition,
  inferConditionState,
} from './scoring';

export function runPhysicalHealthModel(
  context: PhysicalHealthModelContext,
): PhysicalHealthModelOutput {
  const computedAt = new Date();
  const { referenceAt } = context;

  const inferred = context.conditions.map((c) => inferConditionState(c, referenceAt, computedAt));

  const conditions = inferred.map(({ update: _update, ...view }) => view);

  const signals = buildPhysicalHealthSignals(conditions);
  const confidence = computeAggregateConfidence(conditions);
  const dataCompleteness = classifyDataCompleteness(context.conditions);

  const physicalHealthState = {
    conditions,
    activeConditionCount: signals.activeConditionCount,
    aggregateTrainingCapacity: signals.aggregateTrainingCapacity,
    primaryLimitingConditionId: findPrimaryLimitingCondition(conditions),
    trainingBlockedByCondition: signals.trainingBlockedByCondition,
    confidence,
    dataCompleteness,
    modelId: 'physical-health-v1' as const,
    computedAt,
    trainingDayId: context.trainingDayId,
  };

  const decision = buildPhysicalHealthDecision(signals);
  const recommendation = buildPhysicalHealthRecommendation(signals, confidence);

  const conditionUpdates = inferred.map((item) => ({
    conditionId: item.conditionId,
    ...item.update,
  }));

  return {
    signals,
    physicalHealthState,
    decision,
    recommendation,
    conditionUpdates,
  };
}

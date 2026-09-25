import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { DecisionSnapshotContext } from './types';

function readDecisionField<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

/**
 * Freezes the physiological context at recommendation time. Embedded verbatim into
 * CoachingDecision — never a reference to AthleteSnapshotRecord, which is upserted
 * per day and cannot be safely dereferenced later (see ADR-006).
 */
export function buildDecisionSnapshotContext(snapshot: AthleteSnapshot): DecisionSnapshotContext {
  const { decision, physicalHealth, fatigue, confidence } = snapshot;

  return {
    confidence,
    confidenceTier: readDecisionField(decision?.confidenceTier),
    overallVerdict: readDecisionField(decision?.overallVerdict),
    limitingFactorSystem: readDecisionField(decision?.limitingFactor?.system),
    physicalHealthCapacity: readDecisionField(physicalHealth?.aggregateTrainingCapacity),
    fatigueTrainingCapacity: readDecisionField(fatigue?.trainingCapacity),
  };
}

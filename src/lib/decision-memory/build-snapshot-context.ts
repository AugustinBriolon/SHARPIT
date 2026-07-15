import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { DecisionSnapshotContext } from './types';

/**
 * Freezes the physiological context at recommendation time. Embedded verbatim into
 * CoachingDecision — never a reference to AthleteSnapshotRecord, which is upserted
 * per day and cannot be safely dereferenced later (see ADR-006).
 */
export function buildDecisionSnapshotContext(snapshot: AthleteSnapshot): DecisionSnapshotContext {
  return {
    confidence: snapshot.confidence,
    confidenceTier: snapshot.decision?.confidenceTier ?? null,
    overallVerdict: snapshot.decision?.overallVerdict ?? null,
    limitingFactorSystem: snapshot.decision?.limitingFactor?.system ?? null,
    physicalHealthCapacity: snapshot.physicalHealth?.aggregateTrainingCapacity ?? null,
    fatigueTrainingCapacity: snapshot.fatigue?.trainingCapacity ?? null,
  };
}

import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type {
  AdaptationData,
  DailyStrainData,
  DecisionData,
  EnvironmentSnapshotData,
  FatigueData,
  LimitingFactor,
  OverallVerdict,
  PhysicalHealthData,
  RecoveryData,
} from '@/hooks/use-today';

/**
 * Decision-first projection of AthleteSnapshot for client hooks and legacy adapters.
 * Product surfaces must read `decision` — not `reasoning`.
 */
export type AthleteSnapshotProductView = {
  decision: DecisionData | null;
  adviceActionable: boolean;
  todaysDecision: OverallVerdict | null;
  limitingFactor: LimitingFactor | null;
  confidence: number | null;
  confidenceLabel: string | null;
  readiness: number | null;
  sleepScore: number | null;
  adaptationIndex: number | null;
  recovery: RecoveryData | null;
  fatigue: FatigueData | null;
  adaptation: AdaptationData | null;
  physicalHealth: PhysicalHealthData | null;
  environment: EnvironmentSnapshotData | null;
  dailyStrain: DailyStrainData | null;
};

export function snapshotToProductView(snapshot: AthleteSnapshot): AthleteSnapshotProductView {
  return {
    decision: snapshot.decision,
    adviceActionable: snapshot.adviceActionable,
    todaysDecision: snapshot.todaysDecision,
    limitingFactor: snapshot.limitingFactor,
    confidence: snapshot.confidence,
    confidenceLabel: snapshot.confidenceLabel,
    readiness: snapshot.readiness,
    sleepScore: snapshot.sleepScore,
    adaptationIndex: snapshot.adaptationIndex,
    recovery: snapshot.recovery,
    fatigue: snapshot.fatigue,
    adaptation: snapshot.adaptation,
    physicalHealth: snapshot.physicalHealth,
    environment: snapshot.environment ?? null,
    dailyStrain: snapshot.dailyStrain,
  };
}

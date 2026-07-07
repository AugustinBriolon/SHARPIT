import type { AthleteFreshnessSnapshot } from '@/core/athlete-state/freshness';
import type {
  AdaptationData,
  DailyStrainData,
  EngineRecommendation,
  FatigueData,
  LimitingFactor,
  OverallVerdict,
  ReasoningData,
  RecoveryData,
} from '@/hooks/use-today';

/**
 * Canonical Athlete Snapshot — official athlete state at a point in time.
 *
 * Immutable once generated. Consumers (Today, notifications, widgets) read
 * this object only — they never recompute inference.
 */
export type AthleteSnapshotBriefing = {
  content: string;
  generatedAt: string;
  readiness: number | null;
};

export type AthleteSnapshot = {
  /** Unique id for this generation (deterministic fingerprint). */
  snapshotId: string;
  athleteId: string;
  trainingDayId: string;
  generatedAt: string;

  freshness: AthleteFreshnessSnapshot;

  recovery: RecoveryData | null;
  fatigue: FatigueData | null;
  adaptation: AdaptationData | null;
  dailyStrain: DailyStrainData | null;
  reasoning: ReasoningData | null;

  /** Product-oriented summary — derived deterministically from inference. */
  readiness: number | null;
  todaysDecision: OverallVerdict | null;
  limitingFactor: LimitingFactor | null;
  confidence: number | null;
  briefing: AthleteSnapshotBriefing | null;
  recommendation: EngineRecommendation | null;
  primaryProductMessage: string | null;

  /** Per-domain athlete-facing messages for graceful degradation. */
  domainMessages: Partial<Record<string, string>>;
};

export type AthleteSnapshotEnvelope = {
  snapshot: AthleteSnapshot;
  /** True when a newer snapshot may arrive after background refresh. */
  isRefreshing: boolean;
};

export function snapshotHasDisplayableContent(snapshot: AthleteSnapshot): boolean {
  if (snapshot.reasoning?.topAction && snapshot.reasoning.overallVerdict !== 'INSUFFICIENT_DATA') {
    return true;
  }
  if (snapshot.recovery?.readinessScore != null) return true;
  if (snapshot.fatigue?.fatigueIndex != null) return true;
  if (snapshot.briefing?.content) return true;
  if (snapshot.primaryProductMessage) return true;
  return false;
}

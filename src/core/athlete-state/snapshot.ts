import type { AthleteFreshnessSnapshot } from '@/core/athlete-state/freshness';
import type { DailyPhaseResolution } from '@/lib/daily-phase/types';
import type { PhaseNarrative } from '@/lib/daily-phase/narrative';
import type {
  AdaptationData,
  DailyStrainData,
  EngineRecommendation,
  FatigueData,
  LimitingFactor,
  OverallVerdict,
  PhysicalHealthData,
  ReasoningData,
  RecoveryData,
  EnvironmentSnapshotData,
  DecisionData,
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
  physicalHealth: PhysicalHealthData | null;
  environment?: EnvironmentSnapshotData | null;
  dailyStrain: DailyStrainData | null;
  reasoning: ReasoningData | null;
  /** Canonical cross-model decision — single source of truth for product surfaces. */
  decision: DecisionData | null;

  /** Product-oriented summary — derived deterministically from inference. */
  readiness: number | null;
  /** Presentation-only — projected at snapshot build. */
  sleepScore: number | null;
  /** Presentation-only — projected at snapshot build. */
  adaptationIndex: number | null;
  /** Presentation-only — projected at snapshot build. */
  adaptationStatus: AdaptationData['adaptationStatus'] | null;
  /** Presentation-only — projected at snapshot build. */
  adaptationTrend: AdaptationData['adaptationTrend'] | null;
  todaysDecision: OverallVerdict | null;
  limitingFactor: LimitingFactor | null;
  confidence: number | null;
  briefing: AthleteSnapshotBriefing | null;
  recommendation: EngineRecommendation | null;
  primaryProductMessage: string | null;

  /** Per-domain athlete-facing messages for graceful degradation. */
  domainMessages: Partial<Record<string, string>>;

  /** True when verdict, recommendation and training advice meet minimum confidence. */
  adviceActionable: boolean;
  /** Athlete-facing explanation when advice is withheld. */
  insufficientDataMessage: string | null;
  /** Shown under Effort ring when daily strain is not yet measured. */
  effortUnavailableMessage: string | null;
  /** Human-readable confidence tier for Today UI. */
  confidenceLabel: string | null;

  /** Athlete-centric moment of the training day (session status → athlete state → time). */
  dailyPhase: DailyPhaseResolution;
  /** Deterministic copy for hero / product surfaces for the current phase. */
  phaseNarrative: PhaseNarrative;
};

export type AthleteSnapshotEnvelope = {
  snapshot: AthleteSnapshot;
  /** True when a newer snapshot may arrive after background refresh. */
  isRefreshing: boolean;
};

export function snapshotHasDisplayableContent(snapshot: AthleteSnapshot): boolean {
  if (snapshot.adviceActionable) return true;
  if (snapshot.briefing?.content) return true;
  if (
    snapshot.recovery?.readinessScore != null &&
    snapshot.recovery.readinessCategory !== 'INSUFFICIENT_DATA'
  ) {
    return true;
  }
  if (snapshot.primaryProductMessage || snapshot.insufficientDataMessage) return true;
  return false;
}

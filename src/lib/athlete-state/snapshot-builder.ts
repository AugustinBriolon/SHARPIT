import { createHash } from 'node:crypto';
import type { AthleteFreshnessSnapshot } from '@/core/athlete-state/freshness';
import type { AthleteSnapshot, AthleteSnapshotBriefing } from '@/core/athlete-state/snapshot';
import {
  buildSnapshotDailyPhase,
  type SnapshotActivityInput,
  type SnapshotPhaseBuildParams,
  type SnapshotPlannedSessionInput,
} from '@/lib/athlete-state/snapshot-phase';
import { applyTruthfulnessOverlay } from '@/lib/athlete-state/snapshot-truthfulness';
import { activityMatchesTrainingDay } from '@/lib/training-day';
import type { TodayState } from '@/hooks/use-today';
import {
  decisionVerdict,
  isAdviceActionableFromDecision,
  limitingFactorFromDecision,
  resolveRecommendationFromDecision,
} from '@/lib/decision/projection';

export type SnapshotBuildInput = {
  athleteId: string;
  trainingDayId: string;
  todayState: TodayState;
  freshness: AthleteFreshnessSnapshot;
  briefing?: AthleteSnapshotBriefing | null;
  phaseContext: Omit<SnapshotPhaseBuildParams, 'todayState' | 'trainingDayId' | 'adviceActionable'>;
};

function buildDomainMessages(freshness: AthleteFreshnessSnapshot): Partial<Record<string, string>> {
  const messages: Partial<Record<string, string>> = {};
  for (const domain of freshness.domains) {
    if (domain.productMessage) {
      messages[domain.domain] = domain.productMessage;
    }
  }
  return messages;
}

/** Bump when phase narrative copy rules change — forces snapshot regen. */
const PHASE_NARRATIVE_VERSION = 'v6';

function fingerprintParts(
  input: SnapshotBuildInput,
  dailyPhasePhase: string,
  completedCount: number,
  remainingPlanned: number,
): string[] {
  const { trainingDayId, todayState, freshness, briefing } = input;
  return [
    trainingDayId,
    todayState.recovery?.computedAt ?? '—',
    todayState.fatigue?.computedAt ?? '—',
    todayState.adaptation?.computedAt ?? '—',
    todayState.physicalHealth?.computedAt ?? '—',
    todayState.environment?.computedAt ?? '—',
    todayState.reasoning?.computedAt ?? '—',
    todayState.decision?.computedAt ?? '—',
    todayState.dailyStrain?.dailyTss?.toString() ?? '—',
    briefing?.generatedAt ?? '—',
    freshness.computedAt,
    PHASE_NARRATIVE_VERSION,
    dailyPhasePhase,
    String(completedCount),
    String(remainingPlanned),
  ];
}

/**
 * Deterministic fingerprint — same inputs produce the same snapshotId.
 */
export function computeSnapshotId(
  input: SnapshotBuildInput,
  dailyPhasePhase: string,
  completedCount: number,
  remainingPlanned: number,
): string {
  const parts = fingerprintParts(input, dailyPhasePhase, completedCount, remainingPlanned);
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

/**
 * Build an Athlete Snapshot from inference output and freshness.
 * Pure function — deterministic for identical inputs.
 */
export function buildAthleteSnapshot(input: SnapshotBuildInput): AthleteSnapshot {
  const { athleteId, trainingDayId, todayState, freshness, briefing, phaseContext } = input;
  const {
    reasoning,
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
    environment,
    dailyStrain,
    decision,
  } = todayState;

  const generatedAt = new Date().toISOString();
  const confidence = decision?.confidence ?? reasoning?.confidence ?? recovery?.confidence ?? null;
  const adviceActionablePre = isAdviceActionableFromDecision(decision);

  const { dailyPhase, phaseNarrative } = buildSnapshotDailyPhase({
    ...phaseContext,
    trainingDayId,
    todayState,
    adviceActionable: adviceActionablePre,
  });

  const snapshotId = computeSnapshotId(
    input,
    dailyPhase.phase,
    dailyPhase.signals.completedSessionCount,
    dailyPhase.signals.remainingPlannedCount,
  );

  const domainMessages = buildDomainMessages(freshness);

  const basePrimaryProductMessage =
    freshness.primaryProductMessage ??
    (decisionVerdict(decision) === 'INSUFFICIENT_DATA'
      ? (domainMessages.recovery ?? domainMessages.sleep ?? domainMessages.reasoning ?? null)
      : null);

  const draft: Omit<
    AthleteSnapshot,
    'adviceActionable' | 'insufficientDataMessage' | 'effortUnavailableMessage' | 'confidenceLabel'
  > = {
    snapshotId,
    athleteId,
    trainingDayId,
    generatedAt,
    freshness,
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
    environment,
    dailyStrain,
    reasoning,
    decision: decision ?? null,
    readiness: recovery?.readinessScore ?? null,
    sleepScore: recovery?.dimensions.sleep.available
      ? (recovery.dimensions.sleep.score ?? null)
      : null,
    adaptationIndex: adaptation?.adaptationIndex ?? null,
    adaptationStatus: adaptation?.adaptationStatus ?? null,
    adaptationTrend: adaptation?.adaptationTrend ?? null,
    todaysDecision: decisionVerdict(decision),
    limitingFactor: limitingFactorFromDecision(decision),
    confidence,
    briefing: briefing ?? null,
    recommendation: resolveRecommendationFromDecision(decision, todayState),
    primaryProductMessage: basePrimaryProductMessage,
    domainMessages,
    dailyPhase,
    phaseNarrative,
    sessionsDoneToday: phaseContext.activities.filter((a) =>
      activityMatchesTrainingDay(a.date, trainingDayId),
    ),
    plannedToday: phaseContext.plannedSessions.filter((p) =>
      activityMatchesTrainingDay(p.date, trainingDayId),
    ),
  };

  const overlay = applyTruthfulnessOverlay(draft);

  return {
    ...draft,
    ...overlay,
  };
}

export type { SnapshotActivityInput, SnapshotPlannedSessionInput };

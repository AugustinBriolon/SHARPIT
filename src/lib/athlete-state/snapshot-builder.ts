import { createHash } from 'node:crypto';
import type { AthleteFreshnessSnapshot } from '@/core/athlete-state/freshness';
import type { AthleteSnapshot, AthleteSnapshotBriefing } from '@/core/athlete-state/snapshot';
import {
  buildPhasePrimaryProductMessage,
  buildSnapshotDailyPhase,
  type SnapshotActivityInput,
  type SnapshotPhaseBuildParams,
  type SnapshotPlannedSessionInput,
} from '@/lib/athlete-state/snapshot-phase';
import {
  applyTruthfulnessOverlay,
  isAdviceActionable,
} from '@/lib/athlete-state/snapshot-truthfulness';
import type { EngineRecommendation, ReasoningData, TodayState } from '@/hooks/use-today';
import { buildTodayEffortSnapshot } from '@/lib/today-narrative-context';

export type SnapshotBuildInput = {
  athleteId: string;
  trainingDayId: string;
  todayState: TodayState;
  freshness: AthleteFreshnessSnapshot;
  briefing?: AthleteSnapshotBriefing | null;
  phaseContext: Omit<SnapshotPhaseBuildParams, 'todayState' | 'trainingDayId' | 'adviceActionable'>;
};

function pickRecommendation(
  reasoning: ReasoningData | null,
  todayState: TodayState,
): EngineRecommendation | null {
  const { recovery, fatigue, adaptation } = todayState;
  if (!reasoning) {
    return (
      recovery?.recommendation ?? fatigue?.recommendation ?? adaptation?.recommendation ?? null
    );
  }
  switch (reasoning.systemAttentionPriority) {
    case 'RECOVERY':
      return recovery?.recommendation ?? null;
    case 'FATIGUE':
      return fatigue?.recommendation ?? null;
    case 'ADAPTATION':
      return adaptation?.recommendation ?? null;
    default:
      return (
        recovery?.recommendation ?? fatigue?.recommendation ?? adaptation?.recommendation ?? null
      );
  }
}

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
    todayState.reasoning?.computedAt ?? '—',
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
  const { reasoning, recovery, fatigue, adaptation, dailyStrain } = todayState;

  const generatedAt = new Date().toISOString();
  const confidence = reasoning?.confidence ?? recovery?.confidence ?? null;
  const adviceActionablePre = isAdviceActionable(reasoning, confidence);

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
  const effort = buildTodayEffortSnapshot(phaseContext.activities as never, phaseContext.refDate);

  const phaseProductMessage = buildPhasePrimaryProductMessage(
    dailyPhase.phase,
    phaseNarrative,
    effort,
  );

  const basePrimaryProductMessage =
    phaseProductMessage ??
    freshness.primaryProductMessage ??
    (reasoning?.overallVerdict === 'INSUFFICIENT_DATA'
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
    dailyStrain,
    reasoning,
    readiness: recovery?.readinessScore ?? null,
    todaysDecision: reasoning?.overallVerdict ?? null,
    limitingFactor: reasoning?.limitingFactor ?? null,
    confidence,
    briefing: briefing ?? null,
    recommendation: pickRecommendation(reasoning, todayState),
    primaryProductMessage: basePrimaryProductMessage,
    domainMessages,
    dailyPhase,
    phaseNarrative,
  };

  const overlay = applyTruthfulnessOverlay(draft);

  return {
    ...draft,
    ...overlay,
  };
}

export type { SnapshotActivityInput, SnapshotPlannedSessionInput };

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
import { activityMatchesTrainingDay } from '@/lib/training/training-day';
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

function orDash(value: string | null | undefined): string {
  return value ?? '—';
}

function computedAtFrom<T extends { computedAt?: string | null }>(
  slice: T | null | undefined,
): string {
  return orDash(slice?.computedAt);
}

function todayStateFingerprintParts(todayState: TodayState): string[] {
  const slices = [
    todayState.recovery,
    todayState.fatigue,
    todayState.adaptation,
    todayState.physicalHealth,
    todayState.environment,
    todayState.reasoning,
    todayState.decision,
  ];
  return [
    ...slices.map(computedAtFrom),
    orDash(todayState.dailyStrain?.dailyTss?.toString()),
  ];
}

function fingerprintParts(
  input: SnapshotBuildInput,
  dailyPhasePhase: string,
  completedCount: number,
  remainingPlanned: number,
): string[] {
  const { trainingDayId, todayState, freshness, briefing } = input;
  return [
    trainingDayId,
    ...todayStateFingerprintParts(todayState),
    orDash(briefing?.generatedAt),
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

function resolvePrimaryProductMessage(
  freshness: AthleteFreshnessSnapshot,
  decision: TodayState['decision'],
  domainMessages: Partial<Record<string, string>>,
): string | null {
  if (freshness.primaryProductMessage) {
    return freshness.primaryProductMessage;
  }
  if (decisionVerdict(decision) !== 'INSUFFICIENT_DATA') {
    return null;
  }
  return domainMessages.recovery ?? domainMessages.sleep ?? domainMessages.reasoning ?? null;
}

function resolveSleepScore(recovery: TodayState['recovery']): number | null {
  if (!recovery?.dimensions.sleep.available) {
    return null;
  }
  return recovery.dimensions.sleep.score ?? null;
}

type BuildSnapshotDraftInput = {
  input: SnapshotBuildInput;
  snapshotId: string;
  dailyPhase: AthleteSnapshot['dailyPhase'];
  phaseNarrative: AthleteSnapshot['phaseNarrative'];
  domainMessages: Partial<Record<string, string>>;
};

function resolveSnapshotConfidence(todayState: TodayState): number | null {
  const { decision, reasoning, recovery } = todayState;
  return decision?.confidence ?? reasoning?.confidence ?? recovery?.confidence ?? null;
}

function sessionsForTrainingDay<T extends { date: Date | string }>(
  items: T[],
  trainingDayId: string,
): T[] {
  return items.filter((item) => activityMatchesTrainingDay(item.date, trainingDayId));
}

function buildSnapshotCoreFields(
  input: SnapshotBuildInput,
  snapshotId: string,
  dailyPhase: AthleteSnapshot['dailyPhase'],
  phaseNarrative: AthleteSnapshot['phaseNarrative'],
) {
  const { athleteId, trainingDayId, todayState, freshness, briefing, phaseContext } = input;
  const { reasoning, recovery, fatigue, adaptation, physicalHealth, environment, dailyStrain, decision } =
    todayState;

  return {
    snapshotId,
    athleteId,
    trainingDayId,
    generatedAt: new Date().toISOString(),
    freshness,
    recovery,
    fatigue,
    adaptation,
    physicalHealth,
    environment,
    dailyStrain,
    reasoning,
    decision: decision ?? null,
    briefing: briefing ?? null,
    dailyPhase,
    phaseNarrative,
    sessionsDoneToday: sessionsForTrainingDay(phaseContext.activities, trainingDayId),
    plannedToday: sessionsForTrainingDay(phaseContext.plannedSessions, trainingDayId),
  };
}

function adaptationMetrics(adaptation: TodayState['adaptation']) {
  if (!adaptation) {
    return {
      adaptationIndex: null,
      adaptationStatus: null,
      adaptationTrend: null,
    };
  }
  return {
    adaptationIndex: adaptation.adaptationIndex ?? null,
    adaptationStatus: adaptation.adaptationStatus ?? null,
    adaptationTrend: adaptation.adaptationTrend ?? null,
  };
}

function buildSnapshotAdaptationFields(todayState: TodayState) {
  return {
    readiness: todayState.recovery?.readinessScore ?? null,
    sleepScore: resolveSleepScore(todayState.recovery),
    ...adaptationMetrics(todayState.adaptation),
  };
}

function buildSnapshotDecisionFields(
  todayState: TodayState,
  freshness: AthleteFreshnessSnapshot,
  domainMessages: Partial<Record<string, string>>,
) {
  const { decision } = todayState;
  return {
    todaysDecision: decisionVerdict(decision),
    limitingFactor: limitingFactorFromDecision(decision),
    confidence: resolveSnapshotConfidence(todayState),
    recommendation: resolveRecommendationFromDecision(decision, todayState),
    primaryProductMessage: resolvePrimaryProductMessage(freshness, decision, domainMessages),
    domainMessages,
  };
}

function buildSnapshotDerivedFields(
  todayState: TodayState,
  freshness: AthleteFreshnessSnapshot,
  domainMessages: Partial<Record<string, string>>,
) {
  return {
    ...buildSnapshotAdaptationFields(todayState),
    ...buildSnapshotDecisionFields(todayState, freshness, domainMessages),
  };
}

function buildSnapshotDraft({
  input,
  snapshotId,
  dailyPhase,
  phaseNarrative,
  domainMessages,
}: BuildSnapshotDraftInput): Omit<
  AthleteSnapshot,
  'adviceActionable' | 'insufficientDataMessage' | 'effortUnavailableMessage' | 'confidenceLabel'
> {
  return {
    ...buildSnapshotCoreFields(input, snapshotId, dailyPhase, phaseNarrative),
    ...buildSnapshotDerivedFields(input.todayState, input.freshness, domainMessages),
  };
}

/**
 * Build an Athlete Snapshot from inference output and freshness.
 * Pure function — deterministic for identical inputs.
 */
export function buildAthleteSnapshot(input: SnapshotBuildInput): AthleteSnapshot {
  const { trainingDayId, todayState } = input;
  const adviceActionablePre = isAdviceActionableFromDecision(todayState.decision);

  const { dailyPhase, phaseNarrative } = buildSnapshotDailyPhase({
    ...input.phaseContext,
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

  const domainMessages = buildDomainMessages(input.freshness);
  const draft = buildSnapshotDraft({
    input,
    snapshotId,
    dailyPhase,
    phaseNarrative,
    domainMessages,
  });
  const overlay = applyTruthfulnessOverlay(draft);

  return {
    ...draft,
    ...overlay,
  };
}

export type { SnapshotActivityInput, SnapshotPlannedSessionInput };

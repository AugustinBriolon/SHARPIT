import { createHash } from 'node:crypto';
import type { AthleteFreshnessSnapshot } from '@/core/athlete-state/freshness';
import type { AthleteSnapshot, AthleteSnapshotBriefing } from '@/core/athlete-state/snapshot';
import type { EngineRecommendation, ReasoningData, TodayState } from '@/hooks/use-today';

export type SnapshotBuildInput = {
  athleteId: string;
  trainingDayId: string;
  todayState: TodayState;
  freshness: AthleteFreshnessSnapshot;
  briefing?: AthleteSnapshotBriefing | null;
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

/**
 * Deterministic fingerprint — same inputs produce the same snapshotId.
 */
export function computeSnapshotId(input: SnapshotBuildInput): string {
  const parts = [
    input.trainingDayId,
    input.todayState.recovery?.computedAt ?? '—',
    input.todayState.fatigue?.computedAt ?? '—',
    input.todayState.adaptation?.computedAt ?? '—',
    input.todayState.reasoning?.computedAt ?? '—',
    input.todayState.dailyStrain?.dailyTss?.toString() ?? '—',
    input.briefing?.generatedAt ?? '—',
    input.freshness.computedAt,
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

/**
 * Build an Athlete Snapshot from inference output and freshness.
 * Pure function — deterministic for identical inputs.
 */
export function buildAthleteSnapshot(input: SnapshotBuildInput): AthleteSnapshot {
  const { athleteId, trainingDayId, todayState, freshness, briefing } = input;
  const { reasoning, recovery, fatigue, adaptation, dailyStrain } = todayState;

  const generatedAt = new Date().toISOString();
  const snapshotId = computeSnapshotId(input);

  const domainMessages = buildDomainMessages(freshness);
  const primaryProductMessage =
    freshness.primaryProductMessage ??
    (reasoning?.overallVerdict === 'INSUFFICIENT_DATA'
      ? (domainMessages.recovery ??
        domainMessages.sleep ??
        domainMessages.reasoning ??
        'Synchronise tes appareils pour obtenir ton bilan du jour.')
      : null);

  return {
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
    confidence: reasoning?.confidence ?? recovery?.confidence ?? null,
    briefing: briefing ?? null,
    recommendation: pickRecommendation(reasoning, todayState),
    primaryProductMessage,
    domainMessages,
  };
}

import { describe, expect, it } from 'vitest';
import { buildDecisionSnapshotContext } from './build-snapshot-context';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';

function minimalSnapshot(overrides: Partial<AthleteSnapshot> = {}): AthleteSnapshot {
  return {
    snapshotId: 'snap-x',
    athleteId: 'default',
    trainingDayId: '2026-07-15',
    generatedAt: new Date().toISOString(),
    freshness: {
      athleteId: 'default',
      trainingDayId: '2026-07-15',
      computedAt: new Date().toISOString(),
      domains: [],
      providers: [],
      overallFresh: true,
      primaryProductMessage: null,
    },
    recovery: null,
    fatigue: null,
    adaptation: null,
    physicalHealth: null,
    environment: null,
    dailyStrain: null,
    reasoning: null,
    decision: null,
    readiness: null,
    sleepScore: null,
    adaptationIndex: null,
    adaptationStatus: null,
    adaptationTrend: null,
    todaysDecision: null,
    limitingFactor: null,
    confidence: null,
    briefing: null,
    recommendation: null,
    primaryProductMessage: null,
    domainMessages: {},
    adviceActionable: true,
    insufficientDataMessage: null,
    effortUnavailableMessage: null,
    confidenceLabel: null,
    dailyPhase: { phase: 'MORNING' } as AthleteSnapshot['dailyPhase'],
    phaseNarrative: {} as AthleteSnapshot['phaseNarrative'],
    sessionsDoneToday: [],
    plannedToday: [],
    ...overrides,
  };
}

describe('buildDecisionSnapshotContext', () => {
  it('extracts confidence, verdict, and capacity fields from a fully-populated snapshot', () => {
    const snapshot = minimalSnapshot({
      confidence: 0.82,
      todaysDecision: 'TRAIN_SMART',
      decision: {
        confidenceTier: 'HIGH',
        overallVerdict: 'TRAIN_SMART',
        limitingFactor: { system: 'RECOVERY' },
      } as unknown as AthleteSnapshot['decision'],
      physicalHealth: {
        aggregateTrainingCapacity: 'REDUCED',
      } as unknown as AthleteSnapshot['physicalHealth'],
      fatigue: { trainingCapacity: 'LIGHT_ONLY' } as unknown as AthleteSnapshot['fatigue'],
    });

    const context = buildDecisionSnapshotContext(snapshot);

    expect(context).toEqual({
      confidence: 0.82,
      confidenceTier: 'HIGH',
      overallVerdict: 'TRAIN_SMART',
      limitingFactorSystem: 'RECOVERY',
      physicalHealthCapacity: 'REDUCED',
      fatigueTrainingCapacity: 'LIGHT_ONLY',
    });
  });

  it('reads overallVerdict from the canonical decision.overallVerdict, not the deprecated todaysDecision field — regression for a real dogfooding finding where they diverged (todaysDecision null, decision.overallVerdict populated)', () => {
    const snapshot = minimalSnapshot({
      confidence: 0.48,
      todaysDecision: null,
      decision: {
        confidenceTier: 'LOW',
        overallVerdict: 'TRAIN_SMART',
        limitingFactor: { system: null },
      } as unknown as AthleteSnapshot['decision'],
    });

    const context = buildDecisionSnapshotContext(snapshot);

    expect(context.overallVerdict).toBe('TRAIN_SMART');
  });

  it('degrades to nulls when the snapshot has no decision, physicalHealth, or fatigue data', () => {
    const snapshot = minimalSnapshot();

    const context = buildDecisionSnapshotContext(snapshot);

    expect(context).toEqual({
      confidence: null,
      confidenceTier: null,
      overallVerdict: null,
      limitingFactorSystem: null,
      physicalHealthCapacity: null,
      fatigueTrainingCapacity: null,
    });
  });
});

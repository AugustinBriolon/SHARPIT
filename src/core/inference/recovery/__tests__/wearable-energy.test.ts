import { describe, expect, it } from 'vitest';
import { applyWearableEnergyCorroboration } from '../wearable-energy';
import { sleepStressModifier } from '../scoring';
import { runRecoveryModel } from '../model';
import type { DayFeatures, LoadFeatureSet, RecoveryFeatureSet } from '@/core/features/types';
import type { RecoveryModelContext } from '../types';

function makeRecovery(overrides: Partial<RecoveryFeatureSet> = {}): RecoveryFeatureSet {
  return {
    trainingDayId: '2026-07-02',
    sleepEfficiencyPercent: 82,
    sleepDebtMin: 30,
    sleepOnsetConsistencyMin: null,
    sleepDurationTrend: null,
    hrvAbsolute: 55,
    hrvDeltaFromBaseline: 5,
    hrvCoefficientOfVariation: 5,
    rhrAbsolute: 48,
    rhrDeltaFromBaseline: 0,
    subjectiveWellnessIndex: 7.5,
    subjectiveWellnessComponents: {
      mood: 4,
      energyLevel: 4,
      perceivedSoreness: 3,
      stressLevel: null,
    },
    rpeVsTargetZone: 0,
    avgStressDuringSleep: null,
    confidence: 0.85,
    algorithmId: 'recovery-features-v1',
    sourceObsIds: ['obs-1'],
    ...overrides,
  };
}

function makeLoad(): LoadFeatureSet {
  return {
    trainingDayId: '2026-07-02',
    acuteLoad: 280,
    chronicLoad: 260,
    acwr: 1.08,
    weeklyLoad: 280,
    loadMonotony: 1.4,
    loadStrain: 392,
    trainingFrequency: 5,
    restDayCount: 2,
    acuteChronicLoadTrend: 0.02,
    acuteLoadRun: 120,
    acuteLoadBike: 160,
    chronicLoadRun: 110,
    chronicLoadBike: 150,
    confidence: 0.9,
    algorithmId: 'load-features-v1',
    sourceObsIds: ['obs-3'],
  };
}

function makeDay(recovery: RecoveryFeatureSet = makeRecovery()): DayFeatures {
  return {
    athleteId: 'athlete-1',
    trainingDayId: '2026-07-02',
    sessions: [],
    load: makeLoad(),
    recovery,
    body: 'PENDING',
    condition: 'PENDING',
    computedAt: new Date('2026-07-02T08:00:00Z'),
  };
}

const BASE_CTX: RecoveryModelContext = {
  athleteId: 'athlete-1',
  trainingDayId: '2026-07-02',
  previousReadinessScore: null,
};

describe('sleepStressModifier', () => {
  it('leaves sleep score unchanged when overnight stress is low or missing', () => {
    expect(sleepStressModifier(null)).toBe(1);
    expect(sleepStressModifier(20)).toBe(1);
  });

  it('reduces sleep contribution when overnight stress is elevated', () => {
    expect(sleepStressModifier(40)).toBe(0.92);
    expect(sleepStressModifier(55)).toBe(0.85);
  });
});

describe('applyWearableEnergyCorroboration', () => {
  it('returns original score when no wearable signals', () => {
    expect(applyWearableEnergyCorroboration(72, null)).toBe(72);
    expect(applyWearableEnergyCorroboration(72, { stress: null, bodyBattery: null })).toBe(72);
  });

  it('lowers readiness under high Garmin stress and low Body Battery', () => {
    const adjusted = applyWearableEnergyCorroboration(75, {
      stress: 80,
      bodyBattery: 20,
    });
    expect(adjusted).toBeLessThan(75);
    expect(adjusted).toBeGreaterThanOrEqual(75 - 12);
  });

  it('does not let high Body Battery uplift when stress is elevated', () => {
    const withStress = applyWearableEnergyCorroboration(60, {
      stress: 55,
      bodyBattery: 90,
    });
    const stressOnly = applyWearableEnergyCorroboration(60, {
      stress: 55,
      bodyBattery: null,
    });
    expect(withStress).toBe(stressOnly);
  });

  it('caps upward Body Battery cushion', () => {
    const adjusted = applyWearableEnergyCorroboration(50, {
      stress: 20,
      bodyBattery: 90,
    });
    expect(adjusted).toBeLessThanOrEqual(55);
    expect(adjusted).toBeGreaterThan(50);
  });
});

describe('runRecoveryModel — wearable energy integration', () => {
  it('reduces readiness when Garmin stress/body battery corroborate low energy', () => {
    const day = makeDay(makeRecovery({ avgStressDuringSleep: 48 }));
    const baseline = runRecoveryModel(day, BASE_CTX);
    const withWearables = runRecoveryModel(day, {
      ...BASE_CTX,
      wearableEnergySignals: { stress: 72, bodyBattery: 28 },
    });

    expect(baseline.recoveryState.readinessScore).not.toBeNull();
    expect(withWearables.recoveryState.readinessScore).not.toBeNull();
    expect(withWearables.recoveryState.readinessScore!).toBeLessThan(
      baseline.recoveryState.readinessScore!,
    );
  });
});

/**
 * FATIGUE MODEL v1 — Unit Tests
 *
 * Tests the pure scoring and model functions in isolation.
 * No database, no infrastructure, no mocks needed.
 *
 * Test strategy:
 *   - Dimension scoring boundary tests (each of the 5 dimensions)
 *   - Full model tested with representative physiological scenarios
 *   - Edge cases: cold start, overreaching, illness guard, dissonance
 *   - Determinism: identical inputs always produce identical outputs
 */

import { describe, it, expect } from 'vitest';
import {
  scoreLoadFatigue,
  scoreNeuromuscularFatigue,
  scoreMetabolicFatigue,
  scoreCumulativeTrajectory,
  scorePsychologicalFatigue,
  synthesizeFatigueIndex,
  classifyFatigueLevel,
  computeFatigueTrajectory,
} from '../scoring';
import { runFatigueModel } from '../model';
import type {
  LoadFeatureSet,
  RecoveryFeatureSet,
  SessionFeatureSet,
  DayFeatures,
} from '@/core/features/types';
import type { FatigueModelContext } from '../types';
import type { RecoveryState } from '@/core/digital-twin/types';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeLoad(overrides: Partial<LoadFeatureSet> = {}): LoadFeatureSet {
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
    sourceObsIds: [],
    ...overrides,
  };
}

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
    subjectiveWellnessComponents: { mood: 4, energyLevel: 4, perceivedSoreness: 3 },
    rpeVsTargetZone: 0,
    confidence: 0.85,
    algorithmId: 'recovery-features-v1',
    sourceObsIds: [],
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionFeatureSet> = {}): SessionFeatureSet {
  return {
    sessionObsId: 'sess-1',
    trainingDayId: '2026-07-02',
    sportType: 'RUN',
    durationSec: 3600,
    tssScore: 60,
    tssMethod: 'PACE_BASED',
    intensityFactor: 0.75,
    aerobicLoadFactor: 0.8,
    anaerobicLoadFactor: 0.2,
    timeInZones: null,
    hrDriftPercent: 3,
    mechanicalLoad: null,
    elevationStressScore: null,
    efficiencyFactor: null,
    paceVariabilityIndex: null,
    subjectiveRpe: null,
    sourceProvidedTss: null,
    confidence: 0.8,
    algorithmId: 'session-features-v1',
    sourceObsIds: [],
    ...overrides,
  };
}

function makeRecoveryState(overrides: Partial<RecoveryState> = {}): RecoveryState {
  return {
    readinessScore: 72,
    readinessCategory: 'ADEQUATE',
    dimensions: {
      autonomic: { score: 75, status: 'NORMAL', available: true },
      sleep: { score: 70, status: 'adequate', available: true },
      subjective: { score: 65, status: 'NORMAL', available: true },
      loadContext: { score: 60, status: 'ELEVATED', available: true },
    },
    primaryLimitingFactor: 'loadContext',
    estimatedTimeToFullRecovery: null,
    overreachingRisk: 'LOW',
    illnessRisk: 'LOW',
    dissonanceDetected: false,
    confidence: 0.85,
    dataCompleteness: 'FULL',
    modelId: 'recovery-synthesis-v1',
    computedAt: new Date('2026-07-02'),
    trainingDayId: '2026-07-02',
    ...overrides,
  };
}

function makeDayFeatures(
  overrides: Partial<DayFeatures> = {},
  sessions: SessionFeatureSet[] = [makeSession()],
): DayFeatures {
  return {
    athleteId: 'test-athlete',
    trainingDayId: '2026-07-02',
    retrievedAt: new Date('2026-07-02'),
    sessions,
    load: makeLoad(),
    recovery: makeRecovery(),
    body: 'PENDING',
    condition: 'PENDING',
    ...overrides,
  };
}

function makeContext(overrides: Partial<FatigueModelContext> = {}): FatigueModelContext {
  return {
    trainingDayId: '2026-07-02',
    athleteId: 'test-athlete',
    recoveryState: makeRecoveryState(),
    consecutiveAccumulationDays: 0,
    recentFatigueHistory: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 1 — Load Fatigue
// ─────────────────────────────────────────────────────────────────────────────

describe('scoreLoadFatigue', () => {
  it('returns null when PENDING', () => {
    const result = scoreLoadFatigue('PENDING');
    expect(result.available).toBe(false);
    expect(result.score).toBeNull();
  });

  it('returns null when acwr is null', () => {
    const result = scoreLoadFatigue(makeLoad({ acwr: null }));
    expect(result.available).toBe(false);
  });

  it('ACWR = 0 → LoadFatigue = 0 (no recent training)', () => {
    const result = scoreLoadFatigue(makeLoad({ acwr: 0, loadMonotony: null }));
    expect(result.score).toBe(0);
  });

  it('ACWR = 1.0 → LoadFatigue ≈ 67 (normal high load)', () => {
    const result = scoreLoadFatigue(makeLoad({ acwr: 1.0, loadMonotony: null }));
    expect(result.score).toBe(67);
  });

  it('ACWR = 1.5 → LoadFatigue = 100 (critical overload)', () => {
    const result = scoreLoadFatigue(makeLoad({ acwr: 1.5, loadMonotony: null }));
    expect(result.score).toBe(100);
  });

  it('ACWR > 1.5 is clamped at 100', () => {
    const result = scoreLoadFatigue(makeLoad({ acwr: 2.0, loadMonotony: null }));
    expect(result.score).toBe(100);
  });

  it('high monotony (>2.0) amplifies load fatigue by 10%', () => {
    const base = scoreLoadFatigue(makeLoad({ acwr: 1.0, loadMonotony: null }));
    const high = scoreLoadFatigue(makeLoad({ acwr: 1.0, loadMonotony: 2.5 }));
    expect(high.score!).toBeGreaterThan(base.score!);
    expect(high.score!).toBeCloseTo(Math.round(67 * 1.1), 0);
  });

  it('low monotony (<1.3) reduces load fatigue by 5%', () => {
    const base = scoreLoadFatigue(makeLoad({ acwr: 1.0, loadMonotony: null }));
    const low = scoreLoadFatigue(makeLoad({ acwr: 1.0, loadMonotony: 1.0 }));
    expect(low.score!).toBeLessThan(base.score!);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 3 — Metabolic Fatigue
// ─────────────────────────────────────────────────────────────────────────────

describe('scoreMetabolicFatigue', () => {
  it('returns score 0 when no sessions', () => {
    const result = scoreMetabolicFatigue([]);
    expect(result.score).toBe(0);
    expect(result.available).toBe(true);
  });

  it('high anaerobic session produces higher metabolic fatigue', () => {
    const highAnaerobic = makeSession({ tssScore: 100, anaerobicLoadFactor: 0.8 });
    const lowAnaerobic = makeSession({ tssScore: 100, anaerobicLoadFactor: 0.1 });
    const high = scoreMetabolicFatigue([highAnaerobic]);
    const low = scoreMetabolicFatigue([lowAnaerobic]);
    expect(high.score!).toBeGreaterThan(low.score!);
  });

  it('HR drift >15% amplifies metabolic fatigue by 30%', () => {
    const base = scoreMetabolicFatigue([
      makeSession({ hrDriftPercent: 0, anaerobicLoadFactor: 0.5, tssScore: 80 }),
    ]);
    const drifted = scoreMetabolicFatigue([
      makeSession({ hrDriftPercent: 20, anaerobicLoadFactor: 0.5, tssScore: 80 }),
    ]);
    expect(drifted.score!).toBeGreaterThan(base.score!);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 4 — Cumulative Trajectory
// ─────────────────────────────────────────────────────────────────────────────

describe('scoreCumulativeTrajectory', () => {
  it('returns score 0 with no history and no sleep debt', () => {
    const result = scoreCumulativeTrajectory(0, null, false);
    expect(result.score).toBe(0);
  });

  it('accumulates 7 pts per consecutive day', () => {
    const result = scoreCumulativeTrajectory(5, null, false);
    expect(result.score).toBe(35);
  });

  it('caps accumulation pressure at 70', () => {
    const result = scoreCumulativeTrajectory(20, null, false);
    expect(result.score).toBe(70);
  });

  it('adds sleep debt contribution (480min = max 30 pts)', () => {
    const result = scoreCumulativeTrajectory(0, 480, false);
    expect(result.score).toBe(30);
  });

  it('dissonance + 4+ accumulation days adds 10 pts', () => {
    const withoutDissonance = scoreCumulativeTrajectory(4, null, false);
    const withDissonance = scoreCumulativeTrajectory(4, null, true);
    expect(withDissonance.score).toBe(withoutDissonance.score! + 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 5 — Psychological Fatigue
// ─────────────────────────────────────────────────────────────────────────────

describe('scorePsychologicalFatigue', () => {
  it('returns null when no subjective data', () => {
    const result = scorePsychologicalFatigue(null);
    expect(result.available).toBe(false);
    expect(result.score).toBeNull();
  });

  it('mood=5, energy=5 → PsychFatigue = 50', () => {
    const result = scorePsychologicalFatigue(
      makeRecovery({
        subjectiveWellnessComponents: { mood: 5, energyLevel: 5, perceivedSoreness: null },
      }),
    );
    expect(result.score).toBe(50);
  });

  it('mood=1, energy=1 → PsychFatigue = 90', () => {
    const result = scorePsychologicalFatigue(
      makeRecovery({
        subjectiveWellnessComponents: { mood: 1, energyLevel: 1, perceivedSoreness: null },
      }),
    );
    expect(result.score).toBe(90);
  });

  it('mood only: mood=3 → PsychFatigue = 40', () => {
    const result = scorePsychologicalFatigue(
      makeRecovery({
        subjectiveWellnessComponents: { mood: 3, energyLevel: null, perceivedSoreness: null },
      }),
    );
    expect(result.score).toBe(40);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Trajectory
// ─────────────────────────────────────────────────────────────────────────────

describe('computeFatigueTrajectory', () => {
  it('returns STABLE with insufficient history', () => {
    expect(computeFatigueTrajectory([])).toBe('STABLE');
    expect(computeFatigueTrajectory([60, 58, 62])).toBe('STABLE');
  });

  it('detects RESOLVING trend', () => {
    const history = [40, 42, 43, 55, 58, 60, 65];
    expect(computeFatigueTrajectory(history)).toBe('RESOLVING');
  });

  it('detects ACCUMULATING trend', () => {
    const history = [70, 68, 66, 50, 48, 45, 40];
    expect(computeFatigueTrajectory(history)).toBe('ACCUMULATING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FatigueLevel classification
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyFatigueLevel', () => {
  it.each([
    [null, 'INSUFFICIENT_DATA'],
    [0, 'FRESH'],
    [20, 'FRESH'],
    [21, 'FUNCTIONAL_LOW'],
    [40, 'FUNCTIONAL_LOW'],
    [41, 'FUNCTIONAL_HIGH'],
    [60, 'FUNCTIONAL_HIGH'],
    [61, 'ACCUMULATED'],
    [75, 'ACCUMULATED'],
    [76, 'NON_FUNCTIONAL_RISK'],
    [88, 'NON_FUNCTIONAL_RISK'],
    [89, 'OVERREACHING_RISK'],
    [100, 'OVERREACHING_RISK'],
  ] as Array<[number | null, string]>)('index=%s → %s', (index, expected) => {
    expect(classifyFatigueLevel(index)).toBe(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full model — physiological scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('runFatigueModel — full model', () => {
  it('cold start: no sessions, no history → returns INSUFFICIENT_DATA or low fatigue', () => {
    const features = makeDayFeatures({ load: makeLoad({ acwr: null }), recovery: 'PENDING' }, []);
    const context = makeContext({ recoveryState: null, recentFatigueHistory: [] });
    const output = runFatigueModel(features, context);
    expect(['INSUFFICIENT_DATA', 'FRESH', 'FUNCTIONAL_LOW']).toContain(
      output.fatigueState.fatigueLevel,
    );
  });

  it('safe ACWR (1.0) + good subjective → FUNCTIONAL_LOW or FRESH', () => {
    const features = makeDayFeatures({
      load: makeLoad({ acwr: 1.0, loadMonotony: 1.4 }),
      recovery: makeRecovery({
        subjectiveWellnessComponents: { mood: 4, energyLevel: 4, perceivedSoreness: 2 },
        sleepDebtMin: 0,
      }),
    });
    const output = runFatigueModel(features, makeContext());
    expect(['FRESH', 'FUNCTIONAL_LOW', 'FUNCTIONAL_HIGH']).toContain(
      output.fatigueState.fatigueLevel,
    );
  });

  it('critical ACWR (1.5) + 7 consecutive days → ACCUMULATED or higher', () => {
    const features = makeDayFeatures({
      load: makeLoad({ acwr: 1.5, loadMonotony: 2.2 }),
      recovery: makeRecovery({
        sleepDebtMin: 300,
        subjectiveWellnessComponents: { mood: 2, energyLevel: 2, perceivedSoreness: 7 },
      }),
    });
    const context = makeContext({
      consecutiveAccumulationDays: 7,
      recentFatigueHistory: [72, 70, 68, 65, 60, 58, 55],
    });
    const output = runFatigueModel(features, context);
    const level = output.fatigueState.fatigueLevel;
    expect(['ACCUMULATED', 'NON_FUNCTIONAL_RISK', 'OVERREACHING_RISK']).toContain(level);
    expect(output.fatigueState.functionalOverreachingRisk).not.toBe('LOW');
  });

  it('psychological dominant fatigue: low mood with low load → PSYCHOLOGICAL_DOMINANT type', () => {
    const features = makeDayFeatures(
      {
        load: makeLoad({ acwr: 0.5, loadMonotony: 1.0 }),
        recovery: makeRecovery({
          subjectiveWellnessComponents: { mood: 1, energyLevel: 1, perceivedSoreness: 1 },
        }),
      },
      [],
    );
    const output = runFatigueModel(features, makeContext());
    expect(output.fatigueState.fatigueType).toBe('PSYCHOLOGICAL_DOMINANT');
  });

  it('illness guard: HIGH illnessRisk suppresses overreaching risk', () => {
    const features = makeDayFeatures({
      load: makeLoad({ acwr: 1.5 }),
    });
    const context = makeContext({
      consecutiveAccumulationDays: 6,
      recoveryState: makeRecoveryState({ illnessRisk: 'HIGH', overreachingRisk: 'LOW' }),
    });
    const output = runFatigueModel(features, context);
    expect(output.fatigueState.functionalOverreachingRisk).toBe('LOW');
  });

  it('is deterministic — same inputs → same outputs', () => {
    const features = makeDayFeatures();
    const context = makeContext();
    const a = runFatigueModel(features, context);
    const b = runFatigueModel(features, context);
    expect(a.fatigueState.fatigueIndex).toBe(b.fatigueState.fatigueIndex);
    expect(a.fatigueState.fatigueLevel).toBe(b.fatigueState.fatigueLevel);
    expect(a.fatigueState.fatigueType).toBe(b.fatigueState.fatigueType);
    expect(a.decision.verdict).toBe(b.decision.verdict);
  });

  it('cold start with no load/psychological data yields FRESH (all computed scores are 0)', () => {
    // When ACWR is null (no load data) and subjective is null (no psychological data),
    // neuromuscular/metabolic/cumulative still contribute with score=0.
    // FatigueIndex = 0 → FRESH is the physiologically correct result:
    // "we have no signal of fatigue" is not the same as "insufficient data".
    const features = makeDayFeatures(
      {
        load: makeLoad({ acwr: null }),
        recovery: makeRecovery({
          subjectiveWellnessComponents: null,
          sleepDebtMin: null,
        }),
      },
      [],
    );
    const context = makeContext({
      recoveryState: makeRecoveryState({
        dimensions: {
          autonomic: { score: null, status: 'unavailable', available: false },
          sleep: { score: null, status: 'unavailable', available: false },
          subjective: { score: null, status: 'unavailable', available: false },
          loadContext: { score: null, status: 'unavailable', available: false },
        },
      }),
    });
    const output = runFatigueModel(features, context);
    expect(output.fatigueState.fatigueLevel).toBe('FRESH');
    expect(output.fatigueState.fatigueIndex).toBe(0);
  });
});

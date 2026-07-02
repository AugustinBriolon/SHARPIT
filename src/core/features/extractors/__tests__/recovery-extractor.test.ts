/**
 * RECOVERY FEATURE EXTRACTOR — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { extractRecoveryFeatures, computeRpeVsTargetZone } from '../recovery-extractor';
import type { RecoveryHistory } from '../../types';
import type { ExtractionContext } from '../../context';
import type {
  HrvObservation,
  RestingHrObservation,
  SleepObservation,
  SubjectiveObservation,
} from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────────────────────

const BASE_META = {
  id: 'obs-1',
  athleteId: 'athlete-1',
  source: 'GARMIN' as const,
  receivedAt: new Date('2026-07-02T08:00:00Z'),
  trainingDayId: '2026-07-02',
  qualityFlags: [] as [],
  normalizedAt: new Date('2026-07-02T08:00:01Z'),
};

function makeHrv(value: number, timestamp = new Date('2026-07-02T06:00:00Z')): HrvObservation {
  return {
    ...BASE_META,
    id: `hrv-${value}`,
    type: 'HRV',
    quality: 'MEASURED_OPTICAL',
    valueMsRmssd: value,
    measurementMethod: 'OVERNIGHT_AVERAGE',
    timestamp,
  };
}

function makeRhr(
  value: number,
  timestamp = new Date('2026-07-02T07:00:00Z'),
): RestingHrObservation {
  return {
    ...BASE_META,
    id: `rhr-${value}`,
    type: 'RESTING_HR',
    quality: 'MEASURED_OPTICAL',
    valueBpm: value,
    timestamp,
  };
}

function makeSleep(
  totalMinutes: number,
  opts: { deep?: number; rem?: number; bedtime?: number; timestamp?: Date } = {},
): SleepObservation {
  return {
    ...BASE_META,
    id: `sleep-${totalMinutes}`,
    type: 'SLEEP',
    quality: 'MEASURED_OPTICAL',
    timestamp: opts.timestamp ?? new Date('2026-07-01T22:00:00Z'),
    wakeTimestamp: new Date('2026-07-02T06:00:00Z'),
    totalMinutes,
    deepMin: opts.deep,
    remMin: opts.rem,
    bedtimeMinFromMidnight: opts.bedtime,
  };
}

function makeSubjective(opts: {
  mood?: number;
  energyLevel?: number;
  perceivedSoreness?: number;
  rpe?: number;
}): SubjectiveObservation {
  return {
    ...BASE_META,
    id: 'subj-1',
    type: 'SUBJECTIVE',
    quality: 'MANUAL',
    timestamp: new Date('2026-07-02T08:00:00Z'),
    ...opts,
  };
}

function makeContext(overrides: Partial<ExtractionContext> = {}): ExtractionContext {
  return {
    athleteId: 'athlete-1',
    trainingDayId: '2026-07-02',
    timezone: 'Europe/Paris',
    sleepTargetMinutes: 480,
    ...overrides,
  };
}

/** Build 14-day HRV history with a consistent baseline of `baselineValue`. */
function buildHrvHistory(
  baselineValue: number,
  todayValue: number,
): Array<{ valueMsRmssd: number; timestamp: Date }> {
  const history: Array<{ valueMsRmssd: number; timestamp: Date }> = [];
  const today = new Date('2026-07-02T06:00:00Z');
  history.push({ valueMsRmssd: todayValue, timestamp: today });
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    history.push({ valueMsRmssd: baselineValue, timestamp: d });
  }
  return history;
}

const EMPTY_HISTORY: RecoveryHistory = {
  hrv14d: [],
  rhr14d: [],
  sleep14d: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sleep efficiency
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — sleepEfficiencyPercent', () => {
  it('computes (deepMin + remMin) / totalMinutes × 100', () => {
    const sleep = makeSleep(480, { deep: 90, rem: 100 });
    const result = extractRecoveryFeatures(null, null, sleep, null, EMPTY_HISTORY, makeContext());
    // (90 + 100) / 480 × 100 = 39.58%
    expect(result.sleepEfficiencyPercent).toBeCloseTo(39.58, 1);
  });

  it('returns null when deep or rem data is absent', () => {
    const sleep = makeSleep(480); // no deep/rem data
    const result = extractRecoveryFeatures(null, null, sleep, null, EMPTY_HISTORY, makeContext());
    expect(result.sleepEfficiencyPercent).toBeNull();
  });

  it('returns null when no sleep observation', () => {
    const result = extractRecoveryFeatures(null, null, null, null, EMPTY_HISTORY, makeContext());
    expect(result.sleepEfficiencyPercent).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sleep debt
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — sleepDebtMin', () => {
  it('computes debt = target × n - sum(actual)', () => {
    // 7 nights of 7h (420min), target 8h (480min)
    const sleep14d = Array.from({ length: 7 }, (_, i) => {
      const d = new Date('2026-07-02');
      d.setDate(d.getDate() - i);
      return { totalMinutes: 420, timestamp: d };
    });
    const history: RecoveryHistory = { ...EMPTY_HISTORY, sleep14d };
    const result = extractRecoveryFeatures(
      null,
      null,
      null,
      null,
      history,
      makeContext({ sleepTargetMinutes: 480 }),
    );
    // Debt = 480 × 7 - 420 × 7 = 3360 - 2940 = 420 min
    expect(result.sleepDebtMin).toBeCloseTo(420, 1);
  });

  it('negative debt when athlete sleeps more than target', () => {
    const sleep14d = Array.from({ length: 7 }, (_, i) => {
      const d = new Date('2026-07-02');
      d.setDate(d.getDate() - i);
      return { totalMinutes: 540, timestamp: d };
    });
    const history: RecoveryHistory = { ...EMPTY_HISTORY, sleep14d };
    const result = extractRecoveryFeatures(
      null,
      null,
      null,
      null,
      history,
      makeContext({ sleepTargetMinutes: 480 }),
    );
    // Surplus = 480 × 7 - 540 × 7 = -420 (negative debt = surplus)
    expect(result.sleepDebtMin).toBeLessThan(0);
  });

  it('returns null when no sleep history', () => {
    const result = extractRecoveryFeatures(null, null, null, null, EMPTY_HISTORY, makeContext());
    expect(result.sleepDebtMin).toBeNull();
  });

  it('defaults to 480 min target when no sleepTargetMinutes set', () => {
    const sleep14d = Array.from({ length: 7 }, (_, i) => {
      const d = new Date('2026-07-02');
      d.setDate(d.getDate() - i);
      return { totalMinutes: 480, timestamp: d };
    });
    const history: RecoveryHistory = { ...EMPTY_HISTORY, sleep14d };
    // No sleepTargetMinutes in context → defaults to 480
    const result = extractRecoveryFeatures(
      null,
      null,
      null,
      null,
      history,
      makeContext({ sleepTargetMinutes: undefined }),
    );
    expect(result.sleepDebtMin).toBeCloseTo(0, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sleep onset consistency
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — sleepOnsetConsistencyMin', () => {
  it('returns null when fewer than 4 data points', () => {
    const sleep14d = [
      { totalMinutes: 480, bedtimeMinFromMidnight: 1380, timestamp: new Date('2026-07-01') },
      { totalMinutes: 480, bedtimeMinFromMidnight: 1400, timestamp: new Date('2026-06-30') },
    ];
    const history: RecoveryHistory = { ...EMPTY_HISTORY, sleep14d };
    const result = extractRecoveryFeatures(null, null, null, null, history, makeContext());
    expect(result.sleepOnsetConsistencyMin).toBeNull();
  });

  it('returns 0 when bedtimes are perfectly consistent', () => {
    const sleep14d = Array.from({ length: 7 }, (_, i) => ({
      totalMinutes: 480,
      bedtimeMinFromMidnight: 1380, // 11pm every day
      timestamp: new Date(Date.UTC(2026, 6, 2 - i)),
    }));
    const history: RecoveryHistory = { ...EMPTY_HISTORY, sleep14d };
    const result = extractRecoveryFeatures(null, null, null, null, history, makeContext());
    expect(result.sleepOnsetConsistencyMin).toBeCloseTo(0, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HRV delta from baseline
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — hrvDeltaFromBaseline', () => {
  it('computes (today - baseline) / baseline × 100', () => {
    const todayHrv = makeHrv(70, new Date('2026-07-02T06:00:00Z'));
    const hrv14d = buildHrvHistory(60, 70); // baseline 60, today 70
    const history: RecoveryHistory = { ...EMPTY_HISTORY, hrv14d };

    const result = extractRecoveryFeatures(todayHrv, null, null, null, history, makeContext());
    // Delta = (70 - 60) / 60 × 100 = +16.67%
    expect(result.hrvDeltaFromBaseline).toBeCloseTo(16.67, 1);
  });

  it('returns negative delta when HRV is below baseline', () => {
    const todayHrv = makeHrv(50, new Date('2026-07-02T06:00:00Z'));
    const hrv14d = buildHrvHistory(60, 50); // baseline 60, today 50
    const history: RecoveryHistory = { ...EMPTY_HISTORY, hrv14d };

    const result = extractRecoveryFeatures(todayHrv, null, null, null, history, makeContext());
    expect(result.hrvDeltaFromBaseline).toBeCloseTo(-16.67, 1);
  });

  it('returns null when fewer than 7 prior data points', () => {
    const todayHrv = makeHrv(65);
    const hrv14d = [
      { valueMsRmssd: 65, timestamp: new Date('2026-07-02T06:00:00Z') },
      { valueMsRmssd: 60, timestamp: new Date('2026-07-01T06:00:00Z') },
      // Only 1 prior point (threshold is 7)
    ];
    const history: RecoveryHistory = { ...EMPTY_HISTORY, hrv14d };

    const result = extractRecoveryFeatures(todayHrv, null, null, null, history, makeContext());
    expect(result.hrvDeltaFromBaseline).toBeNull();
  });

  it('returns null when no HRV observation today', () => {
    const hrv14d = buildHrvHistory(60, 60);
    const history: RecoveryHistory = { ...EMPTY_HISTORY, hrv14d };
    const result = extractRecoveryFeatures(null, null, null, null, history, makeContext());
    expect(result.hrvDeltaFromBaseline).toBeNull();
  });

  it('hrvAbsolute is set even when baseline is not established', () => {
    const todayHrv = makeHrv(65);
    const result = extractRecoveryFeatures(
      todayHrv,
      null,
      null,
      null,
      EMPTY_HISTORY,
      makeContext(),
    );
    expect(result.hrvAbsolute).toBe(65);
    expect(result.hrvDeltaFromBaseline).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RHR delta
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — rhrDeltaFromBaseline', () => {
  it('computes today - baseline in bpm', () => {
    const todayRhr = makeRhr(52);
    const rhr14d: RecoveryHistory['rhr14d'] = [
      { valueBpm: 52, timestamp: new Date('2026-07-02T07:00:00Z') },
      ...Array.from({ length: 10 }, (_, i) => ({
        valueBpm: 48,
        timestamp: new Date(Date.UTC(2026, 6, 1 - i, 7)),
      })),
    ];
    const history: RecoveryHistory = { ...EMPTY_HISTORY, rhr14d };
    const result = extractRecoveryFeatures(null, todayRhr, null, null, history, makeContext());
    // Today=52, baseline=48 → delta=+4 bpm
    expect(result.rhrDeltaFromBaseline).toBeCloseTo(4, 1);
  });

  it('returns null when fewer than 7 prior data points', () => {
    const todayRhr = makeRhr(52);
    const rhr14d: RecoveryHistory['rhr14d'] = [
      { valueBpm: 52, timestamp: new Date('2026-07-02') },
      { valueBpm: 48, timestamp: new Date('2026-07-01') },
    ];
    const history: RecoveryHistory = { ...EMPTY_HISTORY, rhr14d };
    const result = extractRecoveryFeatures(null, todayRhr, null, null, history, makeContext());
    expect(result.rhrDeltaFromBaseline).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subjective wellness index
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — subjectiveWellnessIndex', () => {
  it('computes composite index from all three dimensions', () => {
    // mood=4 → 8/10, energy=5 → 10/10, soreness=2 → 8/10
    const subj = makeSubjective({ mood: 4, energyLevel: 5, perceivedSoreness: 2 });
    const result = extractRecoveryFeatures(null, null, null, subj, EMPTY_HISTORY, makeContext());
    // index = 0.35×8 + 0.35×10 + 0.30×(10-2) = 2.8 + 3.5 + 2.4 = 8.7
    expect(result.subjectiveWellnessIndex).toBeCloseTo(8.7, 1);
  });

  it('re-normalizes weights when only some dimensions are available', () => {
    // Only mood available (weight 0.35 → normalized to 1.0)
    const subj = makeSubjective({ mood: 5 });
    const result = extractRecoveryFeatures(null, null, null, subj, EMPTY_HISTORY, makeContext());
    // index = (mood=5 → 10/10) × 1.0 = 10.0
    expect(result.subjectiveWellnessIndex).toBeCloseTo(10.0, 1);
  });

  it('returns null when no subjective observation', () => {
    const result = extractRecoveryFeatures(null, null, null, null, EMPTY_HISTORY, makeContext());
    expect(result.subjectiveWellnessIndex).toBeNull();
    expect(result.subjectiveWellnessComponents).toBeNull();
  });

  it('caps mood value at 10 (scale: 1-5 → multiply by 2 → max 10)', () => {
    const subj = makeSubjective({ mood: 5 }); // max mood
    const result = extractRecoveryFeatures(null, null, null, subj, EMPTY_HISTORY, makeContext());
    expect(result.subjectiveWellnessIndex).toBeLessThanOrEqual(10);
    expect(result.subjectiveWellnessIndex).toBeGreaterThanOrEqual(0);
  });

  it('high soreness reduces wellness index', () => {
    const lowSoreness = makeSubjective({ mood: 4, energyLevel: 4, perceivedSoreness: 0 });
    const highSoreness = makeSubjective({ mood: 4, energyLevel: 4, perceivedSoreness: 8 });
    const ctx = makeContext();
    const r1 = extractRecoveryFeatures(null, null, null, lowSoreness, EMPTY_HISTORY, ctx);
    const r2 = extractRecoveryFeatures(null, null, null, highSoreness, EMPTY_HISTORY, ctx);
    expect(r1.subjectiveWellnessIndex!).toBeGreaterThan(r2.subjectiveWellnessIndex!);
  });

  it('preserves raw component values alongside composite index', () => {
    const subj = makeSubjective({ mood: 3, energyLevel: 4, perceivedSoreness: 5 });
    const result = extractRecoveryFeatures(null, null, null, subj, EMPTY_HISTORY, makeContext());
    expect(result.subjectiveWellnessComponents?.mood).toBe(3);
    expect(result.subjectiveWellnessComponents?.energyLevel).toBe(4);
    expect(result.subjectiveWellnessComponents?.perceivedSoreness).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RPE vs target zone (second pass)
// ─────────────────────────────────────────────────────────────────────────────

describe('computeRpeVsTargetZone', () => {
  it('returns actual - expected (positive = harder than expected)', () => {
    // Expected RPE for RUN = 5.5
    const delta = computeRpeVsTargetZone(7.0, 'RUN');
    expect(delta).toBeCloseTo(1.5, 5);
  });

  it('returns negative when easier than expected', () => {
    // Expected RPE for BIKE = 5.0
    const delta = computeRpeVsTargetZone(3.0, 'BIKE');
    expect(delta).toBeCloseTo(-2.0, 5);
  });

  it('returns null when RPE is null', () => {
    expect(computeRpeVsTargetZone(null, 'RUN')).toBeNull();
  });

  it('returns null when sportType is null', () => {
    expect(computeRpeVsTargetZone(6.0, null)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Confidence
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — confidence', () => {
  it('returns very low confidence when no observations at all', () => {
    const result = extractRecoveryFeatures(null, null, null, null, EMPTY_HISTORY, makeContext());
    expect(result.confidence).toBeLessThan(0.3);
  });

  it('returns higher confidence with multiple observation types', () => {
    const hrv14d = buildHrvHistory(60, 65);
    const history: RecoveryHistory = { ...EMPTY_HISTORY, hrv14d };
    const result = extractRecoveryFeatures(
      makeHrv(65),
      makeRhr(50),
      makeSleep(480, { deep: 90, rem: 100 }),
      makeSubjective({ mood: 4, energyLevel: 4 }),
      history,
      makeContext(),
    );
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('algorithmId is recovery-features-v1', () => {
    const result = extractRecoveryFeatures(null, null, null, null, EMPTY_HISTORY, makeContext());
    expect(result.algorithmId).toBe('recovery-features-v1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source observation IDs
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRecoveryFeatures — source observation IDs', () => {
  it('includes all provided observation IDs', () => {
    const hrv = makeHrv(65);
    const rhr = makeRhr(50);
    const sleep = makeSleep(480);
    const subj = makeSubjective({ mood: 4 });

    const result = extractRecoveryFeatures(hrv, rhr, sleep, subj, EMPTY_HISTORY, makeContext());

    expect(result.sourceObsIds).toContain(hrv.id);
    expect(result.sourceObsIds).toContain(rhr.id);
    expect(result.sourceObsIds).toContain(sleep.id);
    expect(result.sourceObsIds).toContain(subj.id);
  });

  it('excludes IDs for null observations', () => {
    const hrv = makeHrv(65);
    const result = extractRecoveryFeatures(hrv, null, null, null, EMPTY_HISTORY, makeContext());
    expect(result.sourceObsIds).toHaveLength(1);
    expect(result.sourceObsIds[0]).toBe(hrv.id);
  });
});

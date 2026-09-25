/**
 * BODY COMPOSITION FEATURE EXTRACTOR — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { extractBodyFeatures } from '../body-extractor';
import type { BodyHistory } from '../../types';
import type { BodyCompositionObservation } from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────────────────────

function makeObs(overrides: Partial<BodyCompositionObservation> = {}): BodyCompositionObservation {
  return {
    id: 'body-obs-1',
    athleteId: 'athlete-1',
    type: 'BODY_COMPOSITION',
    source: 'RENPHO',
    timestamp: new Date('2026-07-02T07:00:00Z'),
    receivedAt: new Date('2026-07-02T08:00:00Z'),
    trainingDayId: '2026-07-02',
    quality: 'MEASURED_OPTICAL',
    qualityFlags: [],
    normalizedAt: new Date('2026-07-02T08:00:01Z'),
    weightKg: 75,
    fatPercent: 18,
    ...overrides,
  };
}

function makeHistory(
  measurements: Array<{ weightKg: number; fatPercent?: number; daysAgo: number }>,
): BodyHistory {
  return {
    measurements7d: measurements.map(({ weightKg, fatPercent, daysAgo }) => {
      const ts = new Date('2026-07-02');
      ts.setDate(ts.getDate() - daysAgo);
      return { weightKg, fatPercent: fatPercent ?? null, timestamp: ts };
    }),
  };
}

const EMPTY_HISTORY: BodyHistory = { measurements7d: [] };

// ─────────────────────────────────────────────────────────────────────────────
// Basic derivations
// ─────────────────────────────────────────────────────────────────────────────

describe('extractBodyFeatures — basic derivations', () => {
  it('passes through weightKg directly', () => {
    const result = extractBodyFeatures(makeObs({ weightKg: 80 }), EMPTY_HISTORY);
    expect(result.weightKg).toBe(80);
  });

  it('computes fatMassKg = weightKg × (fatPercent / 100)', () => {
    const result = extractBodyFeatures(makeObs({ weightKg: 75, fatPercent: 20 }), EMPTY_HISTORY);
    expect(result.fatMassKg).toBeCloseTo(15, 4);
  });

  it('computes leanMassKg = weightKg × (1 - fatPercent / 100)', () => {
    const result = extractBodyFeatures(makeObs({ weightKg: 75, fatPercent: 20 }), EMPTY_HISTORY);
    expect(result.leanMassKg).toBeCloseTo(60, 4);
  });

  it('fatMassKg and leanMassKg sum to weightKg', () => {
    const result = extractBodyFeatures(makeObs({ weightKg: 80, fatPercent: 15 }), EMPTY_HISTORY);
    expect(result.fatMassKg! + result.leanMassKg!).toBeCloseTo(80, 4);
  });

  it('returns null fatMassKg when fatPercent is absent', () => {
    const result = extractBodyFeatures(makeObs({ fatPercent: undefined }), EMPTY_HISTORY);
    expect(result.fatMassKg).toBeNull();
    expect(result.leanMassKg).toBeNull();
  });

  it('passes through optional body composition fields', () => {
    const result = extractBodyFeatures(
      makeObs({ musclePercent: 45, waterPercent: 60, visceralFat: 8 }),
      EMPTY_HISTORY,
    );
    expect(result.musclePercent).toBe(45);
    expect(result.waterPercent).toBe(60);
    expect(result.visceralFat).toBe(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Trend computation
// ─────────────────────────────────────────────────────────────────────────────

describe('extractBodyFeatures — weight trend', () => {
  it('returns null trend when fewer than 3 data points (including current)', () => {
    const history = makeHistory([{ weightKg: 74, daysAgo: 1 }]); // only 1 prior point
    const result = extractBodyFeatures(makeObs({ weightKg: 75 }), history);
    // Total = current + 1 prior = 2 points → null
    expect(result.weightTrend7d).toBeNull();
  });

  it('computes positive trend for increasing weight', () => {
    const history = makeHistory([
      { weightKg: 72, daysAgo: 6 },
      { weightKg: 73, daysAgo: 4 },
      { weightKg: 74, daysAgo: 2 },
    ]);
    // Current observation = 75kg (day 0)
    const result = extractBodyFeatures(makeObs({ weightKg: 75 }), history);
    // 72→73→74→75 over 6 days → slope ≈ +0.5 kg/day
    expect(result.weightTrend7d).toBeGreaterThan(0);
  });

  it('computes negative trend for decreasing weight', () => {
    const history = makeHistory([
      { weightKg: 78, daysAgo: 6 },
      { weightKg: 77, daysAgo: 4 },
      { weightKg: 76, daysAgo: 2 },
    ]);
    const result = extractBodyFeatures(makeObs({ weightKg: 75 }), history);
    expect(result.weightTrend7d).toBeLessThan(0);
  });

  it('computes fat percent trend', () => {
    const history = makeHistory([
      { weightKg: 75, fatPercent: 20, daysAgo: 6 },
      { weightKg: 75, fatPercent: 19, daysAgo: 4 },
      { weightKg: 75, fatPercent: 18.5, daysAgo: 2 },
    ]);
    const result = extractBodyFeatures(makeObs({ weightKg: 75, fatPercent: 18 }), history);
    expect(result.fatPercentTrend7d).toBeLessThan(0); // decreasing fat %
  });

  it('fat trend is null when any measurement lacks fatPercent', () => {
    const history = makeHistory([
      { weightKg: 75, fatPercent: undefined, daysAgo: 4 },
      { weightKg: 74, fatPercent: 18, daysAgo: 2 },
    ]);
    const result = extractBodyFeatures(makeObs({ weightKg: 75, fatPercent: 18 }), history);
    // One missing fatPercent → insufficient valid points for trend
    expect(result.fatPercentTrend7d).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Confidence
// ─────────────────────────────────────────────────────────────────────────────

describe('extractBodyFeatures — confidence', () => {
  it('confidence is capped at 0.75 (bioimpedance limitation)', () => {
    const result = extractBodyFeatures(
      makeObs({ quality: 'MEASURED_DIRECT' }), // even "direct" is capped
      EMPTY_HISTORY,
    );
    expect(result.confidence).toBeLessThanOrEqual(0.75);
  });

  it('algorithmId is body-features-v1', () => {
    const result = extractBodyFeatures(makeObs(), EMPTY_HISTORY);
    expect(result.algorithmId).toBe('body-features-v1');
  });

  it('source observation ID is included', () => {
    const result = extractBodyFeatures(makeObs({ id: 'body-123' }), EMPTY_HISTORY);
    expect(result.sourceObsIds).toContain('body-123');
  });
});

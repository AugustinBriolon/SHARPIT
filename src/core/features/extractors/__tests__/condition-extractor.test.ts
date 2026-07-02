/**
 * PHYSICAL CONDITION FEATURE EXTRACTOR — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { extractConditionFeatures } from '../condition-extractor';
import type { ConditionHistory } from '../../types';
import type { PhysicalConditionObservation } from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────────────────────

function makeCondition(
  overrides: Partial<PhysicalConditionObservation> = {},
): PhysicalConditionObservation {
  return {
    id: 'cond-1',
    athleteId: 'athlete-1',
    type: 'PHYSICAL_CONDITION',
    source: 'MANUAL',
    timestamp: new Date('2026-07-02T09:00:00Z'),
    receivedAt: new Date('2026-07-02T09:00:00Z'),
    trainingDayId: '2026-07-02',
    quality: 'MANUAL',
    qualityFlags: [],
    normalizedAt: new Date('2026-07-02T09:00:01Z'),
    category: 'PAIN',
    bodyRegion: 'Genou',
    bodySide: 'RIGHT',
    severity: 4,
    affectsTraining: true,
    ...overrides,
  };
}

function makeHistory(
  conditions: Partial<PhysicalConditionObservation>[],
  severityHistory: Array<{ severity: number; daysAgo: number }> = [],
): ConditionHistory {
  return {
    activeConditions: conditions.map((c) => makeCondition(c)),
    severityHistory14d: severityHistory.map(({ severity, daysAgo }) => {
      const d = new Date('2026-07-02');
      d.setDate(d.getDate() - daysAgo);
      return { severity, timestamp: d };
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Active condition count
// ─────────────────────────────────────────────────────────────────────────────

describe('extractConditionFeatures — activeConditionCount', () => {
  it('returns 0 when no active conditions', () => {
    const result = extractConditionFeatures('2026-07-02', makeHistory([]));
    expect(result.activeConditionCount).toBe(0);
  });

  it('counts all active conditions', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]),
    );
    expect(result.activeConditionCount).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Max severity
// ─────────────────────────────────────────────────────────────────────────────

describe('extractConditionFeatures — maxActiveSeverity', () => {
  it('returns 0 when no conditions', () => {
    const result = extractConditionFeatures('2026-07-02', makeHistory([]));
    expect(result.maxActiveSeverity).toBe(0);
  });

  it('returns the highest severity across all conditions', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory([
        { id: 'c1', severity: 3 },
        { id: 'c2', severity: 7 },
        { id: 'c3', severity: 5 },
      ]),
    );
    expect(result.maxActiveSeverity).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Training blocked
// ─────────────────────────────────────────────────────────────────────────────

describe('extractConditionFeatures — trainingBlockedByCondition', () => {
  it('returns false when no conditions', () => {
    const result = extractConditionFeatures('2026-07-02', makeHistory([]));
    expect(result.trainingBlockedByCondition).toBe(false);
  });

  it('returns true when at least one condition has affectsTraining=true AND severity >= 5', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory([{ severity: 6, affectsTraining: true }]),
    );
    expect(result.trainingBlockedByCondition).toBe(true);
  });

  it('returns false when affectsTraining=true but severity < 5', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory([{ severity: 4, affectsTraining: true }]),
    );
    expect(result.trainingBlockedByCondition).toBe(false);
  });

  it('returns false when severity >= 5 but affectsTraining=false', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory([{ severity: 7, affectsTraining: false }]),
    );
    expect(result.trainingBlockedByCondition).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Condition trend
// ─────────────────────────────────────────────────────────────────────────────

describe('extractConditionFeatures — conditionTrend', () => {
  it('returns null when fewer than 3 history points', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory(
        [{ id: 'c1' }],
        [
          { severity: 5, daysAgo: 7 },
          { severity: 4, daysAgo: 3 },
        ],
      ),
    );
    expect(result.conditionTrend).toBeNull();
  });

  it('classifies IMPROVING when severity is decreasing', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory(
        [{ id: 'c1' }],
        [
          { severity: 8, daysAgo: 12 },
          { severity: 6, daysAgo: 8 },
          { severity: 4, daysAgo: 4 },
          { severity: 2, daysAgo: 1 },
        ],
      ),
    );
    expect(result.conditionTrend).toBe('IMPROVING');
  });

  it('classifies WORSENING when severity is increasing', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory(
        [{ id: 'c1' }],
        [
          { severity: 2, daysAgo: 12 },
          { severity: 4, daysAgo: 8 },
          { severity: 6, daysAgo: 4 },
          { severity: 8, daysAgo: 1 },
        ],
      ),
    );
    expect(result.conditionTrend).toBe('WORSENING');
  });

  it('classifies STABLE when severity slope is within threshold', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory(
        [{ id: 'c1' }],
        [
          { severity: 5, daysAgo: 12 },
          { severity: 5, daysAgo: 8 },
          { severity: 5, daysAgo: 4 },
          { severity: 5, daysAgo: 1 },
        ],
      ),
    );
    expect(result.conditionTrend).toBe('STABLE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Confidence and metadata
// ─────────────────────────────────────────────────────────────────────────────

describe('extractConditionFeatures — confidence and metadata', () => {
  it('has high confidence when no conditions (unambiguous state)', () => {
    const result = extractConditionFeatures('2026-07-02', makeHistory([]));
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('has lower confidence with high-severity active conditions', () => {
    const noCond = extractConditionFeatures('2026-07-02', makeHistory([]));
    const highSev = extractConditionFeatures(
      '2026-07-02',
      makeHistory([{ severity: 9, affectsTraining: true }]),
    );
    expect(noCond.confidence).toBeGreaterThan(highSev.confidence);
  });

  it('algorithmId is condition-features-v1', () => {
    const result = extractConditionFeatures('2026-07-02', makeHistory([]));
    expect(result.algorithmId).toBe('condition-features-v1');
  });

  it('includes source observation IDs from all active conditions', () => {
    const result = extractConditionFeatures(
      '2026-07-02',
      makeHistory([{ id: 'c-001' }, { id: 'c-002' }]),
    );
    expect(result.sourceObsIds).toContain('c-001');
    expect(result.sourceObsIds).toContain('c-002');
  });

  it('trainingDayId matches the input', () => {
    const result = extractConditionFeatures('2026-07-02', makeHistory([]));
    expect(result.trainingDayId).toBe('2026-07-02');
  });
});

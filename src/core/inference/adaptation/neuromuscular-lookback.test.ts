import { describe, expect, it } from 'vitest';
import { NEUROMUSCULAR_EFFICIENCY_LOOKBACK_DAYS } from '@/core/inference/adaptation/constants';
import { scoreNeuromuscularEfficiency } from '@/core/inference/adaptation/scoring';
import type { SessionFeatureSet } from '@/core/features/types';

function makeSession(overrides: Partial<SessionFeatureSet> = {}): SessionFeatureSet {
  return {
    sessionObsId: 'sess-1',
    trainingDayId: '2026-07-25',
    sportType: 'RUN',
    durationSec: 45 * 60,
    tssScore: 40,
    tssMethod: 'PACE_BASED',
    intensityFactor: 0.75,
    aerobicLoadFactor: 0.8,
    anaerobicLoadFactor: 0.2,
    timeInZones: null,
    hrDriftPercent: null,
    mechanicalLoad: null,
    elevationStressScore: null,
    efficiencyFactor: null,
    paceVariabilityIndex: null,
    subjectiveRpe: null,
    fosterSessionLoad: null,
    sourceProvidedTss: null,
    confidence: 0.85,
    algorithmId: 'session-features-v1',
    sourceObsIds: [],
    ...overrides,
  };
}

describe('neuromuscular efficiency lookback', () => {
  it('uses a 14-day inclusive window constant aligned with the spec', () => {
    expect(NEUROMUSCULAR_EFFICIENCY_LOOKBACK_DAYS).toBe(14);
  });

  it('scores from yesterday session even when today has none (product lookback)', () => {
    const yesterday = makeSession({
      trainingDayId: '2026-07-25',
      hrDriftPercent: 2.5,
      intensityFactor: 0.8,
    });
    const result = scoreNeuromuscularEfficiency([yesterday]);
    expect(result.available).toBe(true);
    expect(result.score).not.toBeNull();
  });

  it('stays unavailable when the window has no hrDriftPercent', () => {
    expect(scoreNeuromuscularEfficiency([makeSession({ hrDriftPercent: null })]).available).toBe(
      false,
    );
  });

  it('14-day inclusive lookback from 2026-07-26 starts at 2026-07-13', () => {
    const trainingDayId = '2026-07-26';
    const days = NEUROMUSCULAR_EFFICIENCY_LOOKBACK_DAYS - 1;
    const [year, month, day] = trainingDayId.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() - days);
    expect(d.toISOString().split('T')[0]).toBe('2026-07-13');
  });
});

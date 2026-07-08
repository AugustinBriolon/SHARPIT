/**
 * SESSION FEATURE EXTRACTOR — Unit Tests
 *
 * All tests use pure function calls. Zero mocks for domain logic.
 * Infrastructure boundaries (Prisma, events) are not involved.
 */

import { describe, it, expect } from 'vitest';
import { extractSessionFeatures } from '../session-extractor';
import type { SessionExtractorInput } from '../../types';
import type { ExtractionContext } from '../../context';
import type { SessionObservation, SubjectiveObservation } from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Test factories
// ─────────────────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<SessionObservation> = {}): SessionObservation {
  return {
    id: 'obs-session-1',
    athleteId: 'athlete-1',
    type: 'SESSION',
    source: 'GARMIN',
    timestamp: new Date('2026-07-02T07:00:00Z'),
    receivedAt: new Date('2026-07-02T08:00:00Z'),
    trainingDayId: '2026-07-02',
    quality: 'MEASURED_DIRECT',
    qualityFlags: [],
    normalizedAt: new Date('2026-07-02T08:00:01Z'),
    sportType: 'BIKE',
    durationSec: 3600, // 1 hour
    ...overrides,
  };
}

function makeContext(overrides: Partial<ExtractionContext> = {}): ExtractionContext {
  return {
    athleteId: 'athlete-1',
    trainingDayId: '2026-07-02',
    timezone: 'Europe/Paris',
    ...overrides,
  };
}

function makeSubjective(overrides: Partial<SubjectiveObservation> = {}): SubjectiveObservation {
  return {
    id: 'obs-subjective-1',
    athleteId: 'athlete-1',
    type: 'SUBJECTIVE',
    source: 'MANUAL',
    timestamp: new Date('2026-07-02T09:00:00Z'),
    receivedAt: new Date('2026-07-02T09:00:00Z'),
    trainingDayId: '2026-07-02',
    quality: 'MANUAL',
    qualityFlags: [],
    normalizedAt: new Date('2026-07-02T09:00:01Z'),
    ...overrides,
  };
}

function input(
  session: Partial<SessionObservation> = {},
  subjective: Partial<SubjectiveObservation> | null = null,
  stream: SessionExtractorInput['stream'] = null,
): SessionExtractorInput {
  return {
    session: makeSession(session),
    linkedSubjective: subjective ? makeSubjective(subjective) : null,
    stream,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TSS Tier 1 — Power-based
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — TSS: Tier 1 (power-based)', () => {
  it('computes TSS = IF² × durationHr × 100 using normalizedPower and FTP', () => {
    const ctx = makeContext({ ftpW: 300 });
    const result = extractSessionFeatures(
      input({ powerData: { avgWatts: 250, normalizedPower: 270, quality: 'MEASURED_DIRECT' } }),
      ctx,
    );

    // IF = 270 / 300 = 0.9; TSS = 0.9² × 1.0 × 100 = 81
    expect(result.tssScore).toBeCloseTo(81, 2);
    expect(result.tssMethod).toBe('POWER_BASED');
    expect(result.intensityFactor).toBeCloseTo(0.9, 5);
  });

  it('correctly classifies confidence for MEASURED_DIRECT power', () => {
    const ctx = makeContext({ ftpW: 300 });
    const result = extractSessionFeatures(
      input({ powerData: { avgWatts: 300, normalizedPower: 300, quality: 'MEASURED_DIRECT' } }),
      ctx,
    );
    // Power-based confidence: 1.0 × MEASURED_DIRECT (1.0) = 1.0
    expect(result.confidence).toBeCloseTo(1.0, 5);
  });

  it('applies MEASURED_OPTICAL quality penalty for optical power sensors', () => {
    const ctx = makeContext({ ftpW: 300 });
    const result = extractSessionFeatures(
      input({ powerData: { avgWatts: 300, normalizedPower: 300, quality: 'MEASURED_OPTICAL' } }),
      ctx,
    );
    // Power-based confidence: 1.0 × MEASURED_OPTICAL (0.85) = 0.85
    expect(result.confidence).toBeCloseTo(0.85, 5);
  });

  it('records sourceProvidedTss from the observation (not used for canonical TSS)', () => {
    const ctx = makeContext({ ftpW: 300 });
    const result = extractSessionFeatures(
      input({
        powerData: { avgWatts: 250, normalizedPower: 270, quality: 'MEASURED_DIRECT' },
        sourceProvidedStress: { value: 95, quality: 'ESTIMATED' },
      }),
      ctx,
    );
    expect(result.tssScore).toBeCloseTo(81, 2); // canonical TSS, NOT 95
    expect(result.sourceProvidedTss).toBe(95);
  });

  it('skips power-based TSS when normalizedPower is absent', () => {
    const ctx = makeContext({ ftpW: 300, maxHr: 190, restingHr: 45 });
    const result = extractSessionFeatures(
      input({
        powerData: { avgWatts: 250, quality: 'MEASURED_DIRECT' }, // no NP
        hrData: { avgBpm: 155, quality: 'MEASURED_OPTICAL' },
      }),
      ctx,
    );
    expect(result.tssMethod).toBe('TRIMP_HR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TSS Tier 2 — TRIMP-HR
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — TSS: Tier 2 (TRIMP-HR)', () => {
  it('falls back to TRIMP when no power data available', () => {
    const ctx = makeContext({ maxHr: 190, restingHr: 45 });
    const result = extractSessionFeatures(
      input({
        sportType: 'RUN',
        durationSec: 3600,
        hrData: { avgBpm: 155, quality: 'MEASURED_OPTICAL' },
      }),
      ctx,
    );
    expect(result.tssMethod).toBe('TRIMP_HR');
    expect(result.tssScore).toBeGreaterThan(0);
    expect(result.tssScore).toBeLessThan(200); // sanity check: 1hr at moderate HR
  });

  it('produces ~100 TSS for 1 hour at LTHR', () => {
    // LTHR ≈ 0.85 × maxHr = 0.85 × 190 = 161.5
    const ctx = makeContext({ maxHr: 190, restingHr: 45, lthr: 161 });
    const result = extractSessionFeatures(
      input({
        sportType: 'RUN',
        durationSec: 3600,
        hrData: { avgBpm: 161, quality: 'MEASURED_OPTICAL' },
      }),
      ctx,
    );
    // At LTHR, TSS should be approximately 100 (within ±10%)
    expect(result.tssScore).toBeGreaterThan(90);
    expect(result.tssScore).toBeLessThan(110);
    expect(result.tssMethod).toBe('TRIMP_HR');
  });

  it('falls back to estimated LTHR (0.85 × maxHr) when LTHR is not provided', () => {
    const ctx = makeContext({ maxHr: 190, restingHr: 45 }); // no lthr
    const result = extractSessionFeatures(
      input({
        sportType: 'RUN',
        durationSec: 3600,
        hrData: { avgBpm: 161, quality: 'MEASURED_OPTICAL' },
      }),
      ctx,
    );
    // Should still produce a TRIMP-based result
    expect(result.tssMethod).toBe('TRIMP_HR');
    expect(result.tssScore).toBeGreaterThan(0);
  });

  it('TRIMP confidence is capped at 0.75 × hrData.quality confidence', () => {
    const ctx = makeContext({ maxHr: 190, restingHr: 45 });
    const result = extractSessionFeatures(
      input({ hrData: { avgBpm: 155, quality: 'MEASURED_OPTICAL' } }),
      ctx,
    );
    // 0.75 × 0.85 = 0.6375
    expect(result.confidence).toBeCloseTo(0.75 * 0.85, 4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TSS Tier 3 — Pace-based
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — TSS: Tier 3 (pace-based)', () => {
  it('uses pace-based TSS for runs when threshold pace is known', () => {
    const ctx = makeContext({ runThresholdPaceSecPerKm: 270 }); // 4:30/km threshold
    const result = extractSessionFeatures(
      input({
        sportType: 'RUN',
        durationSec: 3600,
        paceData: { avgMinPerKm: 4.5, distanceM: 13333 }, // 4:30/km = threshold pace
      }),
      ctx,
    );
    // IF = threshold / pace = 270 / 270 = 1.0; TSS = 1.0² × 1.0hr × 100 = 100
    expect(result.tssScore).toBeCloseTo(100, 1);
    expect(result.tssMethod).toBe('PACE_BASED');
  });

  it('computes lower TSS for easy run (pace > threshold)', () => {
    const ctx = makeContext({ runThresholdPaceSecPerKm: 270 });
    const result = extractSessionFeatures(
      input({
        sportType: 'RUN',
        durationSec: 3600,
        paceData: { avgMinPerKm: 6.0, distanceM: 10000 }, // 6:00/km = easy
      }),
      ctx,
    );
    // IF = 270 / 360 = 0.75; TSS = 0.75² × 1.0 × 100 = 56.25
    expect(result.tssScore).toBeCloseTo(56.25, 1);
    expect(result.tssMethod).toBe('PACE_BASED');
  });

  it('does NOT use pace-based TSS for BIKE even if threshold pace is set', () => {
    const ctx = makeContext({
      runThresholdPaceSecPerKm: 270,
      maxHr: 190,
      restingHr: 45,
    });
    const result = extractSessionFeatures(
      input({
        sportType: 'BIKE',
        durationSec: 3600,
        hrData: { avgBpm: 155, quality: 'MEASURED_OPTICAL' },
        paceData: { avgMinPerKm: 2.5, distanceM: 24000 },
      }),
      ctx,
    );
    // BIKE should use TRIMP, not pace
    expect(result.tssMethod).toBe('TRIMP_HR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TSS Tier 4 — RPE-based
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — TSS: Tier 4 (RPE-based)', () => {
  it('uses RPE-based TSS when no other data is available', () => {
    const ctx = makeContext(); // no FTP, maxHr, or threshold pace
    const result = extractSessionFeatures(
      input({ sportType: 'STRENGTH', durationSec: 3600 }, { rpe: 7 }),
      ctx,
    );
    // TSS = (7/5)² × 1.0 × 100 = 1.96 × 100 = 196
    expect(result.tssScore).toBeCloseTo(196, 1);
    expect(result.tssMethod).toBe('RPE_BASED');
  });

  it('RPE at 5 (threshold equivalent) produces ~100 TSS for 1 hour', () => {
    const ctx = makeContext();
    const result = extractSessionFeatures(input({ durationSec: 3600 }, { rpe: 5 }), ctx);
    expect(result.tssScore).toBeCloseTo(100, 1);
    expect(result.tssMethod).toBe('RPE_BASED');
  });

  it('RPE confidence is 0.45', () => {
    const ctx = makeContext();
    const result = extractSessionFeatures(input({ durationSec: 3600 }, { rpe: 5 }), ctx);
    expect(result.confidence).toBeCloseTo(0.45, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TSS Tier 5 — Duration factor (last resort)
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — TSS: Tier 5 (duration factor)', () => {
  it('uses sport-specific duration factor as last resort', () => {
    const ctx = makeContext(); // no capabilities
    const result = extractSessionFeatures(input({ sportType: 'YOGA', durationSec: 3600 }), ctx);
    // YOGA = 20 TSS/hr × 1hr = 20
    expect(result.tssScore).toBeCloseTo(20, 1);
    expect(result.tssMethod).toBe('DURATION_FACTOR');
  });

  it('duration factor confidence is 0.25', () => {
    const ctx = makeContext();
    const result = extractSessionFeatures(input({ sportType: 'YOGA', durationSec: 3600 }), ctx);
    expect(result.confidence).toBeCloseTo(0.25, 5);
  });

  it('scales linearly with duration', () => {
    const ctx = makeContext();
    const r1 = extractSessionFeatures(input({ sportType: 'RUN', durationSec: 3600 }), ctx);
    const r2 = extractSessionFeatures(input({ sportType: 'RUN', durationSec: 7200 }), ctx);
    expect(r2.tssScore).toBeCloseTo(r1.tssScore * 2, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mechanical load
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — mechanical load', () => {
  it('computes mechanicalLoad = avgWatts × durationSec / 1000 (kJ)', () => {
    const result = extractSessionFeatures(
      input({ powerData: { avgWatts: 250, normalizedPower: 270, quality: 'MEASURED_DIRECT' } }),
      makeContext({ ftpW: 300 }),
    );
    // 250W × 3600s / 1000 = 900 kJ
    expect(result.mechanicalLoad).toBeCloseTo(900, 1);
  });

  it('returns null when no power data', () => {
    const result = extractSessionFeatures(input(), makeContext());
    expect(result.mechanicalLoad).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Elevation stress
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — elevation stress', () => {
  it('computes elevationStressScore for trail run', () => {
    const result = extractSessionFeatures(
      input({ sportType: 'TRAIL_RUN', elevationM: 1000 }),
      makeContext(),
    );
    // TRAIL_RUN factor = 0.12; score = 1000 × 0.12 = 120
    expect(result.elevationStressScore).toBeCloseTo(120, 1);
  });

  it('returns null when no elevation data', () => {
    const result = extractSessionFeatures(input({ sportType: 'TRAIL_RUN' }), makeContext());
    expect(result.elevationStressScore).toBeNull();
  });

  it('returns null for SWIM (no elevation factor)', () => {
    const result = extractSessionFeatures(
      input({ sportType: 'SWIM', elevationM: 5 }),
      makeContext(),
    );
    expect(result.elevationStressScore).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Efficiency factor
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — efficiency factor', () => {
  it('computes power EF = NP ÷ avgHR', () => {
    const result = extractSessionFeatures(
      input({
        powerData: { avgWatts: 250, normalizedPower: 270, quality: 'MEASURED_DIRECT' },
        hrData: { avgBpm: 150, quality: 'MEASURED_OPTICAL' },
      }),
      makeContext({ ftpW: 300 }),
    );
    // 270 / 150 = 1.8
    expect(result.efficiencyFactor).toBeCloseTo(1.8, 5);
  });

  it('computes pace EF = m/s ÷ avgHR for runs', () => {
    const result = extractSessionFeatures(
      input({
        sportType: 'RUN',
        paceData: { avgMinPerKm: 5.0, distanceM: 12000 },
        hrData: { avgBpm: 150, quality: 'MEASURED_OPTICAL' },
      }),
      makeContext(),
    );
    // speed = 1000 / (5 × 60) = 3.333 m/s; EF = 3.333 / 150 ≈ 0.0222
    expect(result.efficiencyFactor).toBeCloseTo(1000 / (5 * 60) / 150, 4);
  });

  it('returns null when no HR data', () => {
    const result = extractSessionFeatures(
      input({ powerData: { avgWatts: 250, normalizedPower: 270, quality: 'MEASURED_DIRECT' } }),
      makeContext({ ftpW: 300 }),
    );
    expect(result.efficiencyFactor).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subjective features
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — subjective features', () => {
  it('records subjectiveRpe from linked observation', () => {
    const result = extractSessionFeatures(input({ sportType: 'RUN' }, { rpe: 6.5 }), makeContext());
    expect(result.subjectiveRpe).toBe(6.5);
  });

  it('records null subjectiveRpe when no linked observation', () => {
    const result = extractSessionFeatures(input({ sportType: 'RUN' }), makeContext());
    expect(result.subjectiveRpe).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stream-dependent features
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — stream-dependent features', () => {
  it('keeps nulls when no cached stream is available', () => {
    const result = extractSessionFeatures(input(), makeContext());
    expect(result.hrDriftPercent).toBeNull();
    expect(result.aerobicLoadFactor).toBeNull();
    expect(result.anaerobicLoadFactor).toBeNull();
    expect(result.timeInZones).toBeNull();
    expect(result.paceVariabilityIndex).toBeNull();
  });

  it('prefers direct stream metrics over null fallbacks', () => {
    const result = extractSessionFeatures(
      input({ sportType: 'RUN', durationSec: 3600 }, null, {
        aerobicLoadFactor: 0.62,
        anaerobicLoadFactor: 0.18,
        timeInZones: [18, 19.2, 10.8, 6, 3.6],
        hrDriftPercent: 4.7,
        paceVariabilityIndex: 0.054,
      }),
      makeContext(),
    );

    expect(result.aerobicLoadFactor).toBe(0.62);
    expect(result.anaerobicLoadFactor).toBe(0.18);
    expect(result.timeInZones).toEqual([18, 19.2, 10.8, 6, 3.6]);
    expect(result.hrDriftPercent).toBe(4.7);
    expect(result.paceVariabilityIndex).toBe(0.054);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source observation IDs
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — source observation IDs', () => {
  it('includes session observation ID', () => {
    const result = extractSessionFeatures(input(), makeContext());
    expect(result.sourceObsIds).toContain('obs-session-1');
  });

  it('includes linked subjective ID when present', () => {
    const result = extractSessionFeatures(input({}, { id: 'obs-subjective-1' }), makeContext());
    expect(result.sourceObsIds).toContain('obs-session-1');
    expect(result.sourceObsIds).toContain('obs-subjective-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm ID
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSessionFeatures — metadata', () => {
  it('always returns algorithmId session-features-v1', () => {
    const result = extractSessionFeatures(input(), makeContext());
    expect(result.algorithmId).toBe('session-features-v1');
  });

  it('preserves sportType and durationSec', () => {
    const result = extractSessionFeatures(
      input({ sportType: 'SWIM', durationSec: 2700 }),
      makeContext(),
    );
    expect(result.sportType).toBe('SWIM');
    expect(result.durationSec).toBe(2700);
  });
});

import { describe, it, expect } from 'vitest';
import { validate } from './validation';
import type { RawObservation } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

const NOW = new Date('2026-07-02T06:00:00Z');
const BASE = { timestamp: NOW, receivedAt: NOW };

// ─────────────────────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────────────────────

describe('validate SESSION', () => {
  it('accepts a minimal valid session', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'RUN',
      durationSec: 3600,
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
  });

  it('rejects when durationSec is missing', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'RUN',
      durationSec: 0,
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason.code).toBe('OUT_OF_PLAUSIBLE_RANGE');
  });

  it('rejects biologically impossible duration (>24h)', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'RUN',
      durationSec: 90000,
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
  });

  it('rejects impossible power (>3000 W)', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'BIKE',
      durationSec: 3600,
      powerData: { avgWatts: 3500, quality: 'MEASURED_DIRECT' },
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason.code).toBe('OUT_OF_PLAUSIBLE_RANGE');
      if (result.reason.code === 'OUT_OF_PLAUSIBLE_RANGE') {
        expect(result.reason.field).toBe('powerData.avgWatts');
      }
    }
  });

  it('flags OPTICAL_SENSOR when power quality is MEASURED_OPTICAL', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'RUN',
      durationSec: 3600,
      powerData: { avgWatts: 200, quality: 'MEASURED_OPTICAL' },
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('OPTICAL_SENSOR');
  });

  it('flags ESTIMATED_FROM_DURATION when no power, no HR, no sourceProvidedStress', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'SESSION',
      sportType: 'STRENGTH',
      durationSec: 2700,
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('ESTIMATED_FROM_DURATION');
  });

  it('flags ESTIMATED_FROM_HR when sourceProvidedStress quality is ESTIMATED', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'RUN',
      durationSec: 3600,
      hrData: { avgBpm: 155, quality: 'MEASURED_OPTICAL' },
      sourceProvidedStress: { value: 80, quality: 'ESTIMATED' },
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('ESTIMATED_FROM_HR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP
// ─────────────────────────────────────────────────────────────────────────────

describe('validate SLEEP', () => {
  const BEDTIME = new Date('2026-07-01T23:00:00Z');
  const WAKE = new Date('2026-07-02T06:30:00Z');

  it('accepts valid sleep with bedtime and wake', () => {
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SLEEP',
      timestamp: BEDTIME,
      receivedAt: NOW,
      wakeTimestamp: WAKE,
      totalMinutes: 450,
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('OPTICAL_SENSOR');
  });

  it('rejects when wakeTimestamp is before bedtime', () => {
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SLEEP',
      timestamp: WAKE,
      receivedAt: NOW,
      wakeTimestamp: BEDTIME,
      totalMinutes: 450,
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason.code).toBe('TEMPORAL_INCONSISTENCY');
  });

  it('rejects totalMinutes > 960 (>16h)', () => {
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SLEEP',
      timestamp: BEDTIME,
      receivedAt: NOW,
      wakeTimestamp: WAKE,
      totalMinutes: 1000,
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
  });

  it('flags UNUSUALLY_LONG_SLEEP for >10h', () => {
    const longWake = new Date('2026-07-02T14:00:00Z');
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SLEEP',
      timestamp: BEDTIME,
      receivedAt: NOW,
      wakeTimestamp: longWake,
      totalMinutes: 630,
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('UNUSUALLY_LONG_SLEEP');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HRV
// ─────────────────────────────────────────────────────────────────────────────

describe('validate HRV', () => {
  it('accepts overnight average HRV and flags OPTICAL_SENSOR', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'HRV',
      valueMsRmssd: 58,
      measurementMethod: 'OVERNIGHT_AVERAGE',
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('OPTICAL_SENSOR');
  });

  it('accepts chest strap HRV with no quality flags', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'HRV',
      valueMsRmssd: 72,
      measurementMethod: 'CHEST_STRAP',
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).not.toContain('OPTICAL_SENSOR');
  });

  it('rejects HRV below physiological minimum (< 10 ms)', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'HRV',
      valueMsRmssd: 5,
      measurementMethod: 'OVERNIGHT_AVERAGE',
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
  });

  it('rejects HRV above physiological maximum (> 250 ms)', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'HRV',
      valueMsRmssd: 300,
      measurementMethod: 'OVERNIGHT_AVERAGE',
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESTING_HR
// ─────────────────────────────────────────────────────────────────────────────

describe('validate RESTING_HR', () => {
  it('accepts a valid resting HR and flags OPTICAL_SENSOR', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'RESTING_HR',
      valueBpm: 48,
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('OPTICAL_SENSOR');
  });

  it('rejects bradycardia below minimum (< 20 bpm)', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'RESTING_HR',
      valueBpm: 15,
    };
    expect(validate(raw).valid).toBe(false);
  });

  it('rejects tachycardia above maximum (> 120 bpm)', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'RESTING_HR',
      valueBpm: 130,
    };
    expect(validate(raw).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECTIVE
// ─────────────────────────────────────────────────────────────────────────────

describe('validate SUBJECTIVE', () => {
  it('accepts minimal subjective observation with only rpe', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'SUBJECTIVE',
      rpe: 7,
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toHaveLength(0);
  });

  it('rejects when no meaningful field is set', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'SUBJECTIVE',
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason.code).toBe('NO_MEANINGFUL_DATA');
  });

  it('rejects RPE > 10', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'SUBJECTIVE',
      rpe: 11,
    };
    expect(validate(raw).valid).toBe(false);
  });

  it('rejects mood out of 1-5 range', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'SUBJECTIVE',
      mood: 6,
    };
    expect(validate(raw).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICAL_CONDITION
// ─────────────────────────────────────────────────────────────────────────────

describe('validate PHYSICAL_CONDITION', () => {
  it('accepts a valid physical condition', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'PHYSICAL_CONDITION',
      category: 'PAIN',
      bodyRegion: 'Genou droit',
      bodySide: 'RIGHT',
      severity: 5,
    };
    expect(validate(raw).valid).toBe(true);
  });

  it('rejects when bodyRegion is empty', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'PHYSICAL_CONDITION',
      category: 'PAIN',
      bodyRegion: '   ',
      bodySide: 'LEFT',
      severity: 3,
    };
    const result = validate(raw);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason.code).toBe('REQUIRED_FIELD_MISSING');
  });

  it('rejects severity > 10', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'MANUAL',
      type: 'PHYSICAL_CONDITION',
      category: 'INJURY',
      bodyRegion: 'Cheville',
      bodySide: 'LEFT',
      severity: 11,
    };
    expect(validate(raw).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BODY_COMPOSITION
// ─────────────────────────────────────────────────────────────────────────────

describe('validate BODY_COMPOSITION', () => {
  it('accepts a valid measurement', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'RENPHO',
      type: 'BODY_COMPOSITION',
      weightKg: 72.4,
      fatPercent: 18.5,
      musclePercent: 42.0,
    };
    expect(validate(raw).valid).toBe(true);
  });

  it('rejects weight below 30 kg', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'RENPHO',
      type: 'BODY_COMPOSITION',
      weightKg: 20,
    };
    expect(validate(raw).valid).toBe(false);
  });

  it('rejects fat percentage above 60%', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'RENPHO',
      type: 'BODY_COMPOSITION',
      weightKg: 90,
      fatPercent: 65,
    };
    expect(validate(raw).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GARMIN_READINESS
// ─────────────────────────────────────────────────────────────────────────────

describe('validate GARMIN_READINESS', () => {
  it('accepts valid score and always flags PROPRIETARY_MODEL_OUTPUT', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'GARMIN_READINESS',
      score: 72,
      level: 'HIGH',
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('PROPRIETARY_MODEL_OUTPUT');
  });

  it('rejects score > 100', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'GARMIN_READINESS',
      score: 105,
    };
    expect(validate(raw).valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GARMIN_BATTERY
// ─────────────────────────────────────────────────────────────────────────────

describe('validate GARMIN_BATTERY', () => {
  it('accepts valid battery and always flags PROPRIETARY_MODEL_OUTPUT', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'GARMIN_BATTERY',
      peakValue: 85,
      troughValue: 20,
    };
    const result = validate(raw);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.flags).toContain('PROPRIETARY_MODEL_OUTPUT');
  });

  it('rejects peakValue > 100', () => {
    const raw: RawObservation = {
      ...BASE,
      source: 'GARMIN',
      type: 'GARMIN_BATTERY',
      peakValue: 110,
    };
    expect(validate(raw).valid).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { normalize } from './normalization';
import type { RawObservation, AthleteObservationConfig } from './types';

const ATHLETE_ID = 'test-athlete';
const CONFIG: AthleteObservationConfig = {
  trainingDayStartHour: 4,
  timezone: 'Europe/Paris',
};

// ─────────────────────────────────────────────────────────────────────────────
// Training day assignment
// ─────────────────────────────────────────────────────────────────────────────

describe('normalize — training day assignment', () => {
  it('assigns current calendar day when session is after start hour', () => {
    // 07:00 Paris (UTC+2) = 05:00 UTC → after 04:00 start → training day 2026-07-02
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'RUN',
      durationSec: 3600,
      timestamp: new Date('2026-07-02T05:00:00Z'),
      receivedAt: new Date(),
    };
    const obs = normalize('id-1', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.trainingDayId).toBe('2026-07-02');
  });

  it('assigns PREVIOUS calendar day when session is before start hour', () => {
    // 03:00 Paris (UTC+2) = 01:00 UTC → before 04:00 start → training day 2026-07-01
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SESSION',
      sportType: 'RUN',
      durationSec: 1800,
      timestamp: new Date('2026-07-02T01:00:00Z'),
      receivedAt: new Date(),
    };
    const obs = normalize('id-2', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.trainingDayId).toBe('2026-07-01');
  });

  it('uses wakeTimestamp for SLEEP observations (not bedtime)', () => {
    // Bedtime: 2026-07-01 23:00 Paris (21:00 UTC)
    // Wake: 2026-07-02 06:30 Paris (04:30 UTC) → after start hour → training day 2026-07-02
    const bedtime = new Date('2026-07-01T21:00:00Z');
    const wake = new Date('2026-07-02T04:30:00Z');
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SLEEP',
      timestamp: bedtime,
      receivedAt: new Date(),
      wakeTimestamp: wake,
      totalMinutes: 450,
    };
    const obs = normalize('id-3', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.trainingDayId).toBe('2026-07-02');
  });

  it('assigns PREVIOUS day for sleep when athlete wakes before start hour', () => {
    // Wake at 03:00 Paris (01:00 UTC) — before 04:00 start → training day 2026-07-01
    const bedtime = new Date('2026-07-01T19:00:00Z');
    const wake = new Date('2026-07-02T01:00:00Z');
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'SLEEP',
      timestamp: bedtime,
      receivedAt: new Date(),
      wakeTimestamp: wake,
      totalMinutes: 360,
    };
    const obs = normalize('id-4', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.trainingDayId).toBe('2026-07-01');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Quality classification
// ─────────────────────────────────────────────────────────────────────────────

describe('normalize — quality classification', () => {
  const BASE_SESSION: Omit<RawObservation & { type: 'SESSION' }, 'powerData' | 'hrData'> = {
    source: 'GARMIN',
    type: 'SESSION',
    sportType: 'BIKE',
    durationSec: 3600,
    timestamp: new Date('2026-07-02T07:00:00Z'),
    receivedAt: new Date(),
  };

  it('classifies MEASURED_DIRECT when power meter data present', () => {
    const raw: RawObservation = {
      ...BASE_SESSION,
      powerData: { avgWatts: 280, quality: 'MEASURED_DIRECT' },
    };
    const obs = normalize('id-5', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.quality).toBe('MEASURED_DIRECT');
  });

  it('classifies MEASURED_OPTICAL when only optical HR available', () => {
    const raw: RawObservation = {
      ...BASE_SESSION,
      hrData: { avgBpm: 155, quality: 'MEASURED_OPTICAL' },
    };
    const obs = normalize('id-6', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.quality).toBe('MEASURED_OPTICAL');
  });

  it('classifies ESTIMATED when no HR and no power', () => {
    const raw: RawObservation = { ...BASE_SESSION };
    const obs = normalize('id-7', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.quality).toBe('ESTIMATED');
  });

  it('classifies chest-strap HRV as MEASURED_DIRECT', () => {
    const raw: RawObservation = {
      source: 'MANUAL',
      type: 'HRV',
      timestamp: new Date('2026-07-02T06:00:00Z'),
      receivedAt: new Date(),
      valueMsRmssd: 72,
      measurementMethod: 'CHEST_STRAP',
    };
    const obs = normalize('id-8', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.quality).toBe('MEASURED_DIRECT');
  });

  it('classifies overnight HRV as MEASURED_OPTICAL', () => {
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'HRV',
      timestamp: new Date('2026-07-02T06:00:00Z'),
      receivedAt: new Date(),
      valueMsRmssd: 55,
      measurementMethod: 'OVERNIGHT_AVERAGE',
    };
    const obs = normalize('id-9', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.quality).toBe('MEASURED_OPTICAL');
  });

  it('classifies Garmin Readiness as PROPRIETARY_MODEL — invariant', () => {
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'GARMIN_READINESS',
      timestamp: new Date('2026-07-02T06:00:00Z'),
      receivedAt: new Date(),
      score: 70,
    };
    const obs = normalize('id-10', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.quality).toBe('PROPRIETARY_MODEL');
  });

  it('classifies SUBJECTIVE as MANUAL', () => {
    const raw: RawObservation = {
      source: 'MANUAL',
      type: 'SUBJECTIVE',
      timestamp: new Date('2026-07-02T08:00:00Z'),
      receivedAt: new Date(),
      rpe: 7,
    };
    const obs = normalize('id-11', ATHLETE_ID, raw, [], CONFIG);
    expect(obs.quality).toBe('MANUAL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

describe('normalize — metadata assignment', () => {
  it('assigns the provided id and athleteId', () => {
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'RESTING_HR',
      timestamp: new Date('2026-07-02T06:00:00Z'),
      receivedAt: new Date(),
      valueBpm: 48,
    };
    const obs = normalize('my-custom-id', 'athlete-xyz', raw, ['OPTICAL_SENSOR'], CONFIG);
    expect(obs.id).toBe('my-custom-id');
    expect(obs.athleteId).toBe('athlete-xyz');
  });

  it('preserves validation flags in qualityFlags', () => {
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'GARMIN_READINESS',
      timestamp: new Date('2026-07-02T06:00:00Z'),
      receivedAt: new Date(),
      score: 65,
    };
    const obs = normalize('id-flags', ATHLETE_ID, raw, ['PROPRIETARY_MODEL_OUTPUT'], CONFIG);
    expect(obs.qualityFlags).toContain('PROPRIETARY_MODEL_OUTPUT');
  });

  it('sets normalizedAt to a recent date', () => {
    const before = new Date();
    const raw: RawObservation = {
      source: 'GARMIN',
      type: 'RESTING_HR',
      timestamp: new Date('2026-07-02T06:00:00Z'),
      receivedAt: new Date(),
      valueBpm: 52,
    };
    const obs = normalize('id-time', ATHLETE_ID, raw, [], CONFIG);
    const after = new Date();
    expect(obs.normalizedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(obs.normalizedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

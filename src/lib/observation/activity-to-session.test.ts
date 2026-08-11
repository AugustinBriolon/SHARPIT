import { describe, expect, it } from 'vitest';
import {
  storedActivityToSession,
  type StoredActivityForSession,
} from '@/lib/observation/activity-to-session';

const DATE = new Date('2026-07-02T07:00:00.000Z');

function activity(overrides: Partial<StoredActivityForSession> = {}): StoredActivityForSession {
  return { id: 'act-1', type: 'RUN', date: DATE, duration: 3600, ...overrides };
}

describe('storedActivityToSession', () => {
  it('returns null without a usable duration', () => {
    expect(storedActivityToSession(activity({ duration: null }))).toBeNull();
    expect(storedActivityToSession(activity({ duration: 0 }))).toBeNull();
  });

  it('carries the fields the TRIMP tier needs from run metrics', () => {
    const session = storedActivityToSession(
      activity({
        runMetrics: { avgHr: 148, paceSecPerKm: 300, distanceM: 12000, elevationM: 140 },
      }),
    )!;

    expect(session.sportType).toBe('RUN');
    expect(session.durationSec).toBe(3600);
    expect(session.hrData).toEqual({ avgBpm: 148, maxBpm: undefined, quality: 'MEASURED_OPTICAL' });
    expect(session.paceData).toEqual({ avgMinPerKm: 5, distanceM: 12000 });
    expect(session.elevationM).toBe(140);
  });

  it('recovers HR from the stream for sports with no avgHr column', () => {
    // BikeMetrics and SwimMetrics store no avgHr, so without the stream these
    // sports could never reach the TRIMP tier.
    const session = storedActivityToSession(activity({ type: 'BIKE', bikeMetrics: null }), {
      avgHrFromStream: 132.6,
      maxHrFromStream: 178.2,
    })!;

    expect(session.hrData).toEqual({ avgBpm: 133, maxBpm: 178, quality: 'MEASURED_OPTICAL' });
  });

  it('prefers the stored metric over the stream when both exist', () => {
    const session = storedActivityToSession(
      activity({
        runMetrics: { avgHr: 150, paceSecPerKm: null, distanceM: null, elevationM: null },
      }),
      { avgHrFromStream: 99 },
    )!;

    expect(session.hrData?.avgBpm).toBe(150);
  });

  it('marks cycling power as directly measured and omits the borrowed intensity factor', () => {
    const session = storedActivityToSession(
      activity({
        type: 'BIKE',
        bikeMetrics: { avgPower: 195, normalizedPower: 210, elevationM: null, calories: 640 },
      }),
    )!;

    expect(session.powerData).toEqual({
      avgWatts: 195,
      normalizedPower: 210,
      quality: 'MEASURED_DIRECT',
    });
    // Garmin's intensityFactor is derived from Garmin's FTP, not ours.
    expect(session.powerData).not.toHaveProperty('intensityFactor');
    expect(session.calories).toBe(640);
  });

  it('never carries the scale-contaminated stored load', () => {
    // Activity.load coalesces Garmin's TSS with its EPOC training load, two
    // different scales. Propagating it would contaminate the Core, which
    // computes its own TSS.
    const session = storedActivityToSession(
      activity({
        runMetrics: { avgHr: 148, paceSecPerKm: 300, distanceM: 12000, elevationM: null },
      }),
    )!;

    expect(session.sourceProvidedStress).toBeUndefined();
  });

  it('maps hiking to OTHER, the closest available sport factor', () => {
    // SportType has no HIKE member.
    const session = storedActivityToSession(
      activity({
        type: 'HIKE',
        hikeMetrics: { avgHr: 118, distanceM: 14000, elevationM: 800, calories: 900 },
      }),
    )!;

    expect(session.sportType).toBe('OTHER');
    expect(session.hrData?.avgBpm).toBe(118);
    expect(session.elevationM).toBe(800);
  });

  it('omits pace for swimming, whose stored pace uses a different unit', () => {
    const session = storedActivityToSession(
      activity({ type: 'SWIM', swimMetrics: { distanceM: 2000 } }),
    )!;

    expect(session.sportType).toBe('SWIM');
    expect(session.paceData).toBeUndefined();
  });

  it('uses a stable dedup key, preferring the platform id', () => {
    expect(
      storedActivityToSession(activity({ garminId: 'g-1', stravaId: 's-1' }))!.externalId,
    ).toBe('g-1');
    expect(storedActivityToSession(activity({ garminId: null, stravaId: 's-1' }))!.externalId).toBe(
      's-1',
    );
    // Re-runs must land on the same key, so fall back to the row id.
    expect(storedActivityToSession(activity())!.externalId).toBe('act-1');
  });
});

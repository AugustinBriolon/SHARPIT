import { describe, expect, it, vi } from 'vitest';

vi.mock('@sharpit/db/client', () => ({ prisma: {} }));
vi.mock('@sharpit/server/lib/engines/observation-engine', () => ({ observationEngine: {} }));
vi.mock('@sharpit/server/lib/streams/streams', () => ({ persistStream: vi.fn() }));

const { appleHealthActivityData, appleHealthRawStreams, appleHealthWorkoutSchema } =
  await import('./apple-health-workouts');

const run = appleHealthWorkoutSchema.parse({
  id: 'A1B2',
  type: 'RUN',
  title: 'Course à pied',
  start: '2026-09-28T06:30:00.000+02:00',
  durationSec: 3_000,
  distanceM: 10_000,
  energyKcal: 612.4,
  avgHr: 148,
  maxHr: 171,
  elevationM: 84,
});

describe('appleHealthActivityData', () => {
  it('stores a run with its pace, from the workout itself', () => {
    const data = appleHealthActivityData(run);

    expect(data).toMatchObject({
      type: 'RUN',
      source: 'apple-health',
      duration: 3_000,
      title: 'Course à pied',
    });
    expect(data.date).toEqual(new Date('2026-09-28T04:30:00.000Z'));
    expect(data.runMetrics).toEqual({
      create: {
        distanceM: 10_000,
        elevationM: 84,
        paceSecPerKm: 300,
        avgHr: 148,
        avgPower: null,
        cadence: null,
      },
    });
  });

  it('keeps the calories on a ride and names a swim by its pace per 100 m', () => {
    const ride = appleHealthActivityData({ ...run, type: 'BIKE', distanceM: 40_000 });
    expect(ride.bikeMetrics).toMatchObject({ create: { distanceM: 40_000, calories: 612 } });

    const swim = appleHealthActivityData({
      ...run,
      type: 'SWIM',
      durationSec: 1_800,
      distanceM: 1_500,
    });
    expect(swim.swimMetrics).toEqual({ create: { distanceM: 1_500, avgPaceSecPer100m: 120 } });
  });

  it('writes no metrics for strength, and none for a zero distance', () => {
    expect(appleHealthActivityData({ ...run, type: 'STRENGTH' }).runMetrics).toBeUndefined();
    const treadmill = appleHealthActivityData({ ...run, distanceM: 0 });
    expect(treadmill.runMetrics).toMatchObject({ create: { distanceM: null, paceSecPerKm: null } });
  });
});

describe('appleHealthRawStreams', () => {
  it('aligns every series on time and leaves the missing or misaligned ones empty', () => {
    const streams = appleHealthRawStreams({
      ...run,
      stream: {
        time: [0, 5, 10],
        heartrate: [120, null, 140],
        distance: [0, 15],
        latlng: [
          [48.85, 2.35],
          [48.851, 2.351],
          [48.852, 2.352],
        ],
      },
    });

    expect(streams).toEqual({
      time: [0, 5, 10],
      heartrate: [120, 0, 140],
      distance: [],
      altitude: [],
      velocity: [],
      watts: [],
      cadence: [],
      latlng: [
        [48.85, 2.35],
        [48.851, 2.351],
        [48.852, 2.352],
      ],
    });
  });

  it('is nothing without a stream', () => {
    expect(appleHealthRawStreams(run)).toBeNull();
  });
});

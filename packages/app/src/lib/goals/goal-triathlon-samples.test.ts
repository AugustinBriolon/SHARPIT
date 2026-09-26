import { describe, expect, it } from 'vitest';
import {
  collectBikeSpeedSamples,
  collectBrickTransitions,
  collectRaceTransitions,
  collectSwimPaceSamples,
} from '@sharpit/app/lib/goals/goal-triathlon-samples';

describe('goal-triathlon-samples', () => {
  it('collects swim pace from mono-sport activities', () => {
    expect(
      collectSwimPaceSamples([
        {
          id: 's1',
          type: 'SWIM',
          date: '2026-01-01',
          duration: 2400,
          swimMetrics: { distanceM: 2000, avgPaceSecPer100m: 98 },
        },
      ]),
    ).toEqual([{ distanceM: 2000, paceSecPer100m: 98 }]);
  });

  it('collects bike speed from triathlon bike legs (no BikeMetrics.distanceM)', () => {
    expect(
      collectBikeSpeedSamples([
        {
          id: 't1',
          type: 'TRIATHLON',
          date: '2026-01-02',
          duration: 20_000,
          multisportLegs: [
            {
              kind: 'bike',
              label: 'Vélo',
              durationSec: 7200,
              movingDurationSec: 7200,
              distanceM: 60_000,
              avgHr: null,
              avgSpeedMs: null,
              elevationM: null,
              calories: null,
              garminActivityId: null,
              transitionIndex: null,
            },
          ],
        },
      ]),
    ).toEqual([{ distanceM: 60_000, durationSec: 7200 }]);
  });

  it('reads T1/T2 from triathlon multisport legs', () => {
    const samples = collectRaceTransitions([
      {
        id: 't1',
        type: 'TRIATHLON',
        date: '2026-01-03',
        duration: 20_000,
        multisportLegs: [
          {
            kind: 'transition',
            label: 'T1',
            durationSec: 300,
            movingDurationSec: 210,
            distanceM: null,
            avgHr: null,
            avgSpeedMs: null,
            elevationM: null,
            calories: null,
            garminActivityId: null,
            transitionIndex: 1,
          },
          {
            kind: 'transition',
            label: 'T2',
            durationSec: 200,
            movingDurationSec: 150,
            distanceM: null,
            avgHr: null,
            avgSpeedMs: null,
            elevationM: null,
            calories: null,
            garminActivityId: null,
            transitionIndex: 2,
          },
        ],
      },
    ]);
    expect(samples).toEqual([{ t1Sec: 210, t2Sec: 150 }]);
  });

  it('derives brick gaps as T1/T2 proxies', () => {
    const start = new Date('2026-06-01T08:00:00Z');
    const samples = collectBrickTransitions(
      [
        {
          id: 'ps1',
          type: 'BIKE',
          brickGroupId: 'brick-1',
          brickOrder: 1,
          activityId: 'a-bike',
        },
        {
          id: 'ps2',
          type: 'RUN',
          brickGroupId: 'brick-1',
          brickOrder: 2,
          activityId: 'a-run',
        },
      ],
      [
        {
          id: 'a-bike',
          type: 'BIKE',
          date: start,
          duration: 3600,
        },
        {
          id: 'a-run',
          type: 'RUN',
          date: new Date(start.getTime() + 3600 * 1000 + 180 * 1000),
          duration: 2400,
          runMetrics: { distanceM: 8000 },
        },
      ],
    );
    expect(samples).toEqual([{ kind: 't2', gapSec: 180 }]);
  });
});

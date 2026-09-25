import { describe, expect, it } from 'vitest';
import { appleHealthPatch } from './apple-health-merge';

const night = {
  date: '2026-09-21',
  sleepMinutes: 432,
  sleepDeepMin: 70,
  sleepRemMin: 95,
  sleepLightMin: 267,
  sleepBedtimeMin: 1400,
  sleepWakeMin: 412,
};

describe('appleHealthPatch', () => {
  it('fills an empty day', () => {
    expect(
      appleHealthPatch(
        null,
        { ...night, restingHr: 48, totalSteps: 9000 },
        { garminConnected: false },
      ),
    ).toEqual({
      sleepMinutes: 432,
      sleepDeepMin: 70,
      sleepRemMin: 95,
      sleepLightMin: 267,
      sleepBedtimeMin: 1400,
      sleepWakeMin: 412,
      restingHr: 48,
      totalSteps: 9000,
    });
  });

  it('never overwrites what a provider already wrote', () => {
    const patch = appleHealthPatch(
      { sleepMinutes: 351, restingHr: 47 },
      { ...night, restingHr: 52 },
      { garminConnected: true },
    );
    expect(patch).toEqual({});
  });

  it('keeps a night whole rather than mixing stages from two sources', () => {
    const patch = appleHealthPatch({ sleepMinutes: 351, sleepDeepMin: null }, night, {
      garminConnected: true,
    });
    expect(patch.sleepDeepMin).toBeUndefined();
  });

  it('skips Apple HRV while Garmin is connected, and takes it otherwise', () => {
    expect(
      appleHealthPatch(null, { date: '2026-09-21', hrv: 62 }, { garminConnected: true }),
    ).toEqual({});
    expect(
      appleHealthPatch(null, { date: '2026-09-21', hrv: 62 }, { garminConnected: false }),
    ).toEqual({
      hrv: 62,
    });
  });

  it('ignores an empty night', () => {
    expect(
      appleHealthPatch(null, { date: '2026-09-21', sleepMinutes: 0 }, { garminConnected: false }),
    ).toEqual({});
  });
});

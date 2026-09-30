import { describe, expect, it } from 'vitest';
import { appleHealthWallClockStart } from './apple-health-time';

describe('appleHealthWallClockStart', () => {
  it('reads a start with its offset as the wall clock it shows', () => {
    expect(appleHealthWallClockStart('2026-09-30T12:23:34+02:00', 'America/New_York')).toEqual(
      new Date('2026-09-30T12:23:34.000Z'),
    );
  });

  it('places a UTC start in the athlete’s time zone, as Garmin stores the same session', () => {
    // Today's brick: Apple sent 10:23:34Z, Garmin stored 12:23:34 (Paris, summer time).
    expect(appleHealthWallClockStart('2026-09-30T10:23:34Z', 'Europe/Paris')).toEqual(
      new Date('2026-09-30T12:23:34.000Z'),
    );
    expect(appleHealthWallClockStart('2026-12-15T10:00:00Z', 'Europe/Paris')).toEqual(
      new Date('2026-12-15T11:00:00.000Z'),
    );
  });

  it('keeps a session just after midnight on its own day', () => {
    expect(appleHealthWallClockStart('2026-09-30T22:30:00Z', 'Europe/Paris')).toEqual(
      new Date('2026-10-01T00:30:00.000Z'),
    );
  });

  it('keeps milliseconds and accepts an offset without colon', () => {
    expect(appleHealthWallClockStart('2026-09-30T12:23:34.512+0200', 'UTC')).toEqual(
      new Date('2026-09-30T12:23:34.512Z'),
    );
  });
});

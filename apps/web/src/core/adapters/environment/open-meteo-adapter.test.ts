import { afterEach, describe, expect, it } from 'vitest';
import { parseOpenMeteoHourlyTime } from '@/core/adapters/environment/open-meteo-adapter';
import { shouldUseWeatherArchive } from '@/lib/planned-session/forecast/forecast-fetch';

describe('parseOpenMeteoHourlyTime', () => {
  const previousTz = process.env.TZ;

  afterEach(() => {
    if (previousTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTz;
    }
  });

  it('parses offset-less UTC labels identically under Paris and UTC hosts', () => {
    process.env.TZ = 'Europe/Paris';
    const underParis = parseOpenMeteoHourlyTime('2026-07-26T14:00', 'UTC');

    process.env.TZ = 'UTC';
    const underUtc = parseOpenMeteoHourlyTime('2026-07-26T14:00', 'UTC');

    expect(underParis.toISOString()).toBe('2026-07-26T14:00:00.000Z');
    expect(underUtc.toISOString()).toBe('2026-07-26T14:00:00.000Z');
  });

  it('preserves explicit Z / offset timestamps', () => {
    expect(parseOpenMeteoHourlyTime('2026-07-26T14:00:00.000Z', 'UTC').toISOString()).toBe(
      '2026-07-26T14:00:00.000Z',
    );
    expect(parseOpenMeteoHourlyTime('2026-07-26T16:00:00+02:00', 'UTC').toISOString()).toBe(
      '2026-07-26T14:00:00.000Z',
    );
  });
});

describe('shouldUseWeatherArchive', () => {
  it('uses archive for a completed session from yesterday even if sync is today', () => {
    const windowEnd = new Date('2026-07-25T16:00:00.000Z');
    const syncNow = new Date('2026-07-26T15:00:00.000Z');
    expect(shouldUseWeatherArchive(windowEnd, syncNow)).toBe(true);
  });

  it('uses forecast while the session window is still recent', () => {
    const windowEnd = new Date('2026-07-26T14:30:00.000Z');
    const now = new Date('2026-07-26T15:00:00.000Z');
    expect(shouldUseWeatherArchive(windowEnd, now)).toBe(false);
  });
});

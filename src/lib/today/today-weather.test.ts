import { describe, expect, it } from 'vitest';
import {
  nameWeatherLocation,
  selectTodayWeather,
  type WeatherHour,
} from '@/lib/today/today-weather';

const NOW = new Date('2026-08-21T09:30:00');

function hour(at: string, overrides: Partial<WeatherHour> = {}): WeatherHour {
  return {
    at: new Date(at),
    airTemperatureC: 20,
    precipitationMm: 0,
    cloudCoverPct: 10,
    solarRadiationWm2: 400,
    ...overrides,
  };
}

describe('selectTodayWeather', () => {
  it('reports the hour nearest now, not the day average', () => {
    const selected = selectTodayWeather(
      [
        hour('2026-08-21T06:00:00', { airTemperatureC: 14 }),
        hour('2026-08-21T09:00:00', { airTemperatureC: 18 }),
        hour('2026-08-21T15:00:00', { airTemperatureC: 26 }),
      ],
      NOW,
    );
    // The mean of these three is 19.3 — the number the first implementation showed.
    expect(selected?.tempC).toBe(18);
  });

  it('ignores neighbouring days the padded fetch window drags in', () => {
    const selected = selectTodayWeather(
      [
        hour('2026-08-20T09:00:00', { airTemperatureC: 2 }),
        hour('2026-08-21T09:00:00', { airTemperatureC: 18 }),
        hour('2026-08-22T09:00:00', { airTemperatureC: 35 }),
      ],
      NOW,
    );
    expect(selected?.tempC).toBe(18);
  });

  it('reads the condition from what is still ahead, not the morning already spent', () => {
    const selected = selectTodayWeather(
      [
        hour('2026-08-21T06:00:00', { precipitationMm: 8, cloudCoverPct: 100 }),
        hour('2026-08-21T14:00:00', { precipitationMm: 0, cloudCoverPct: 5 }),
        hour('2026-08-21T18:00:00', { precipitationMm: 0, cloudCoverPct: 5 }),
      ],
      NOW,
    );
    expect(selected?.condition).toBe('clear');
  });

  it('falls back to the whole day once nothing is left ahead', () => {
    const lateEvening = new Date('2026-08-21T23:45:00');
    const selected = selectTodayWeather(
      [hour('2026-08-21T20:00:00', { airTemperatureC: 17, precipitationMm: 4 })],
      lateEvening,
    );
    expect(selected?.tempC).toBe(17);
    expect(selected?.condition).toBe('rain');
  });

  it('returns nothing rather than guessing when today has no reading', () => {
    expect(selectTodayWeather([], NOW)).toBeNull();
    expect(selectTodayWeather([hour('2026-08-20T09:00:00')], NOW)).toBeNull();
    expect(
      selectTodayWeather([hour('2026-08-21T09:00:00', { airTemperatureC: null })], NOW),
    ).toBeNull();
  });
});

describe('nameWeatherLocation', () => {
  it('names the place the athlete configured', () => {
    expect(
      nameWeatherLocation({ label: '132, Rue Moslard, Petit-Colombes', source: 'home' }),
    ).toEqual({
      city: 'Petit-Colombes',
      locationKnown: true,
    });
  });

  it('follows the athlete when they are away', () => {
    expect(nameWeatherLocation({ label: 'Chamonix-Mont-Blanc', source: 'travel' })).toEqual({
      city: 'Chamonix-Mont-Blanc',
      locationKnown: true,
    });
  });

  it('stays unnamed rather than dropping the reading', () => {
    // The GPS chain answers with bare coordinates. The header showed nothing at
    // all on any day carrying a tracked activity.
    expect(nameWeatherLocation({ source: 'activity-gps' })).toEqual({
      city: '',
      locationKnown: false,
    });
  });

  it('does not let hard-coded coordinates pass as a known place', () => {
    expect(nameWeatherLocation({ label: 'Domicile', source: 'default' })).toEqual({
      city: '',
      locationKnown: false,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatActivityWeatherChip,
  formatCityFromLocationLabel,
  inferActivityWeatherCondition,
  needsWeatherEnrichment,
  parseActivityWeather,
  serializeActivityWeather,
} from '@/lib/activity/activity-weather';

describe('activity-weather', () => {
  it('serializes and parses structured weather', () => {
    const raw = serializeActivityWeather({
      city: "Les Sables-d'Olonne",
      avgTempC: 21.4,
      condition: 'partly-cloudy',
    });

    expect(parseActivityWeather(raw)).toEqual({
      city: "Les Sables-d'Olonne",
      avgTempC: 21.4,
      condition: 'partly-cloudy',
    });
  });

  it('parses legacy weather strings', () => {
    expect(parseActivityWeather("Les Sables-d'Olonne · 22°C · vent 15 km/h · pluie")).toEqual({
      city: "Les Sables-d'Olonne",
      avgTempC: 22,
      condition: 'rain',
    });
  });

  it('formats chip with city and rounded temperature only', () => {
    expect(
      formatActivityWeatherChip({
        city: 'Colombes',
        avgTempC: 18.6,
        condition: 'cloudy',
      }),
    ).toBe('Colombes · 19°C');
  });

  it('infers rain before cloud cover', () => {
    expect(
      inferActivityWeatherCondition({
        maxPrecipitationMm: 3,
        avgPrecipitationMm: 1,
        avgCloudCoverPct: 10,
        avgSolarRadiationWm2: null,
      }),
    ).toBe('rain');
  });

  it('does not infer drizzle from trace precipitation on a sunny slot', () => {
    expect(
      inferActivityWeatherCondition({
        maxPrecipitationMm: 0.7,
        avgPrecipitationMm: 0.05,
        avgCloudCoverPct: 35,
        avgSolarRadiationWm2: 520,
      }),
    ).toBe('clear');
  });

  it('needs enrichment for address-only legacy values', () => {
    expect(needsWeatherEnrichment('Rue Example, Courbevoie')).toBe(true);
  });

  it('needs enrichment for outdated weather version', () => {
    expect(
      needsWeatherEnrichment(
        JSON.stringify({ v: 1, city: 'Courbevoie', avgTempC: 20, condition: 'clear' }),
      ),
    ).toBe(true);
  });

  it('shortens geocoded addresses to city', () => {
    expect(formatCityFromLocationLabel('Rue Jean-Pierre Timbaud, Courbevoie')).toBe('Courbevoie');
  });

  it('formats chip with city only', () => {
    expect(
      formatActivityWeatherChip({
        city: 'Rue Jean-Pierre Timbaud, Quartier Cœur de Ville, Courbevoie',
        avgTempC: 28.7,
        condition: 'clear',
      }),
    ).toBe('Courbevoie · 29°C');
  });
});

/**
 * Psychrometric wet-bulb estimate.
 */

import type { MetricValue, WeatherMeasurements } from '../types';

function isSet<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

function missingWetBulbInput(
  temp: number | null | undefined,
  rh: number | null | undefined,
): MetricValue<number> {
  return {
    available: false,
    quality: 'MISSING',
    confidence: 0,
    reason: 'MISSING_INPUT',
    explanation:
      'Température de bulbe humide indisponible : mesure directe ou couple température/humidité requis.',
    missingFields: [
      ...(!isSet(temp) ? (['airTemperatureC'] as const) : []),
      ...(!isSet(rh) ? (['relativeHumidityPct'] as const) : []),
    ],
  };
}

export function computeEstimatedWetBulbC(measurements: WeatherMeasurements): MetricValue<number> {
  if (isSet(measurements.wetBulbC)) {
    return {
      available: true,
      value: measurements.wetBulbC,
      quality: 'EXACT',
      confidence: 0.95,
      method: 'DIRECT_MEASUREMENT',
      basedOn: ['wetBulbC'],
    };
  }

  const temp = measurements.airTemperatureC;
  const rh = measurements.relativeHumidityPct;

  if (!isSet(temp) || !isSet(rh)) {
    return missingWetBulbInput(temp, rh);
  }

  const tw =
    temp * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(temp + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;

  return {
    available: true,
    value: Math.round(tw * 10) / 10,
    quality: 'ESTIMATED',
    confidence: 0.7,
    method: 'STINSON_PSYCHROMETRIC',
    basedOn: ['airTemperatureC', 'relativeHumidityPct'],
  };
}

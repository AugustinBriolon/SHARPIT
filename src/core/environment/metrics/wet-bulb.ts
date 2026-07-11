/**
 * Psychrometric wet-bulb estimate.
 */

import type { MetricValue, WeatherMeasurements } from '../types';

export function computeEstimatedWetBulbC(measurements: WeatherMeasurements): MetricValue<number> {
  if (measurements.wetBulbC != null) {
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

  if (temp == null || rh == null) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'MISSING_INPUT',
      explanation:
        'Température de bulbe humide indisponible : mesure directe ou couple température/humidité requis.',
      missingFields: [
        ...(temp == null ? (['airTemperatureC'] as const) : []),
        ...(rh == null ? (['relativeHumidityPct'] as const) : []),
      ],
    };
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

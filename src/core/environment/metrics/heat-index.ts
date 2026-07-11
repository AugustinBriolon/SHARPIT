/**
 * Heat index (°C) — NOAA Rothfusz regression.
 */

import type { MetricValue, WeatherMeasurements } from '../types';

const MIN_AIR_TEMP_C = 27;

export function computeHeatIndexC(measurements: WeatherMeasurements): MetricValue<number> {
  const temp = measurements.airTemperatureC;
  const rh = measurements.relativeHumidityPct;

  if (temp == null || rh == null) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'MISSING_INPUT',
      explanation:
        'Indice de chaleur indisponible : température de l’air et humidité relative requises.',
      missingFields: [
        ...(temp == null ? (['airTemperatureC'] as const) : []),
        ...(rh == null ? (['relativeHumidityPct'] as const) : []),
      ],
    };
  }

  if (temp < MIN_AIR_TEMP_C) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'METHOD_NOT_APPLICABLE',
      explanation: `Indice de chaleur non applicable en dessous de ${MIN_AIR_TEMP_C}°C.`,
    };
  }

  const tF = (temp * 9) / 5 + 32;
  const hiF =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * rh -
    0.22475541 * tF * rh -
    0.00683783 * tF * tF -
    0.05481717 * rh * rh +
    0.00122874 * tF * tF * rh +
    0.00085282 * tF * rh * rh -
    0.00000199 * tF * tF * rh * rh;

  const hiC = ((hiF - 32) * 5) / 9;

  return {
    available: true,
    value: Math.round(hiC * 10) / 10,
    quality: 'ESTIMATED',
    confidence: 0.85,
    method: 'NOAA_ROTHFUSZ',
    basedOn: ['airTemperatureC', 'relativeHumidityPct'],
  };
}

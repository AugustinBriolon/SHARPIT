/**
 * WBGT — strict availability gate.
 */

import type { ExposureSetting, MetricValue, WeatherMeasurements } from '../types';
import { computeEstimatedWetBulbC } from './wet-bulb';

export function computeWbgtC(
  measurements: WeatherMeasurements,
  exposure: ExposureSetting,
): MetricValue<number> {
  const globe = measurements.globeTemperatureC;
  const wetBulb = computeEstimatedWetBulbC(measurements);

  if (!wetBulb.available) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'INSUFFICIENT_OBSERVATIONS',
      explanation: 'WBGT indisponible : bulbe humide (mesuré ou dérivable) requis.',
      missingFields: wetBulb.missingFields,
    };
  }

  if (globe == null) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'MISSING_INPUT',
      explanation:
        'WBGT indisponible : température au globe requise. SHARPIT ne déduit pas le globe à partir de la seule température/humidité.',
      missingFields: ['globeTemperatureC'],
    };
  }

  if (exposure === 'INDOOR') {
    const wbgt = 0.7 * wetBulb.value + 0.3 * globe;
    return {
      available: true,
      value: Math.round(wbgt * 10) / 10,
      quality: 'ESTIMATED',
      confidence: Math.min(wetBulb.confidence, 0.8),
      method: 'ISO_7243_INDOOR_SIMPLIFIED',
      basedOn: wetBulb.basedOn.includes('wetBulbC')
        ? (['wetBulbC', 'globeTemperatureC'] as const)
        : (['airTemperatureC', 'relativeHumidityPct', 'globeTemperatureC'] as const),
    };
  }

  if (exposure === 'UNKNOWN') {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'METHOD_NOT_APPLICABLE',
      explanation:
        'WBGT indisponible : contexte intérieur/extérieur inconnu — formule non appliquée.',
    };
  }

  const dry = measurements.airTemperatureC;
  if (dry == null) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'MISSING_INPUT',
      explanation: 'WBGT extérieur indisponible : température sèche requise en plus du globe.',
      missingFields: ['airTemperatureC'],
    };
  }

  const wbgt = 0.7 * wetBulb.value + 0.2 * globe + 0.1 * dry;
  return {
    available: true,
    value: Math.round(wbgt * 10) / 10,
    quality: 'ESTIMATED',
    confidence: Math.min(wetBulb.confidence, 0.75),
    method: 'ISO_7243_OUTDOOR_SIMPLIFIED',
    basedOn: [...wetBulb.basedOn, 'globeTemperatureC', 'airTemperatureC'],
  };
}

/**
 * @internal Engine-only weather feature derivations.
 */

import type {
  EnvironmentalFeatures,
  ExposureSetting,
  MetricValue,
  ThermalStressBand,
  WeatherMeasurements,
} from '../types';
import { computeHeatIndexC } from './heat-index';
import { computeEstimatedWetBulbC } from './wet-bulb';
import { computeWbgtC } from './wbgt';

function bandFromWbgt(wbgt: number): ThermalStressBand {
  if (wbgt < 18) return 'LOW';
  if (wbgt < 23) return 'MODERATE';
  if (wbgt < 28) return 'HIGH';
  return 'EXTREME';
}

function bandFromHeatIndex(hi: number): ThermalStressBand {
  if (hi < 27) return 'LOW';
  if (hi < 32) return 'MODERATE';
  if (hi < 39) return 'HIGH';
  return 'EXTREME';
}

export function computeThermalStressBand(
  measurements: WeatherMeasurements,
  exposure: ExposureSetting,
  heatIndex: MetricValue<number>,
  wbgt: MetricValue<number>,
): MetricValue<ThermalStressBand> {
  if (wbgt.available) {
    return {
      available: true,
      value: bandFromWbgt(wbgt.value),
      quality: wbgt.quality,
      confidence: wbgt.confidence,
      method: 'WBGT_BANDS',
      basedOn: wbgt.basedOn,
    };
  }

  if (heatIndex.available) {
    return {
      available: true,
      value: bandFromHeatIndex(heatIndex.value),
      quality: heatIndex.quality,
      confidence: heatIndex.confidence,
      method: 'HEAT_INDEX_BANDS',
      basedOn: heatIndex.basedOn,
    };
  }

  const temp = measurements.airTemperatureC;
  if (temp != null && exposure !== 'INDOOR') {
    const band: ThermalStressBand = temp < 18 ? 'LOW' : temp < 28 ? 'MODERATE' : 'HIGH';
    return {
      available: true,
      value: band,
      quality: 'EXACT',
      confidence: 0.5,
      method: 'AIR_TEMP_ONLY_COARSE',
      basedOn: ['airTemperatureC'],
    };
  }

  return {
    available: false,
    quality: 'MISSING',
    confidence: 0,
    reason: 'INSUFFICIENT_OBSERVATIONS',
    explanation:
      'Bande de stress thermique indisponible : WBGT, indice de chaleur ou température exploitable requis.',
  };
}

export function computeWindChillC(measurements: WeatherMeasurements): MetricValue<number> {
  const temp = measurements.airTemperatureC;
  const wind = measurements.windSpeedMps;

  if (temp == null || wind == null) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'MISSING_INPUT',
      explanation: 'Refroidissement éolien indisponible : température et vent requis.',
      missingFields: [
        ...(temp == null ? (['airTemperatureC'] as const) : []),
        ...(wind == null ? (['windSpeedMps'] as const) : []),
      ],
    };
  }

  if (temp > 10 || wind < 1.3) {
    return {
      available: false,
      quality: 'MISSING',
      confidence: 0,
      reason: 'METHOD_NOT_APPLICABLE',
      explanation: 'Refroidissement éolien non applicable au-dessus de 10°C ou vent faible.',
    };
  }

  const windKmh = wind * 3.6;
  const wc =
    13.12 +
    0.6215 * temp -
    11.37 * Math.pow(windKmh, 0.16) +
    0.3965 * temp * Math.pow(windKmh, 0.16);

  return {
    available: true,
    value: Math.round(wc * 10) / 10,
    quality: 'ESTIMATED',
    confidence: 0.8,
    method: 'ENVIRONMENT_CANADA_WIND_CHILL',
    basedOn: ['airTemperatureC', 'windSpeedMps'],
  };
}

export function buildEnvironmentalFeatures(
  measurements: WeatherMeasurements,
  exposure: ExposureSetting,
): EnvironmentalFeatures {
  const heatIndexC = computeHeatIndexC(measurements);
  const estimatedWetBulbC = computeEstimatedWetBulbC(measurements);
  const wbgtC = computeWbgtC(measurements, exposure);

  return {
    heatIndexC,
    estimatedWetBulbC,
    wbgtC,
    thermalStressBand: computeThermalStressBand(measurements, exposure, heatIndexC, wbgtC),
    windChillC: computeWindChillC(measurements),
  };
}

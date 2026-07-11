/**
 * EnvironmentalStress — extensible stressor collection (environment-v1.1).
 */

import type {
  EnvironmentalApplicability,
  EnvironmentalObservationRecord,
  EnvironmentalStress,
  EnvironmentalStressObservationRef,
  EnvironmentalStressor,
  EnvironmentalStressorId,
  MetricUnavailableReason,
  MetricValue,
  WeatherMeasurements,
} from './types';
import { isEnvironmentApplicable, applicabilityToExposure } from './applicability';
import type { BuildEnvironmentalStressOptions } from './exposure';
import { buildEnvironmentalFeatures } from './metrics/weather-features';

const KNOWN_STRESSOR_IDS: readonly EnvironmentalStressorId[] = [
  'THERMAL',
  'WIND',
  'ALTITUDE',
  'AIR_QUALITY',
  'HYDRATION',
] as const;

export function listKnownEnvironmentalStressorIds(): readonly EnvironmentalStressorId[] {
  return KNOWN_STRESSOR_IDS;
}

export function getEnvironmentalStressor(
  stress: EnvironmentalStress,
  id: EnvironmentalStressorId,
): EnvironmentalStressor | undefined {
  return stress.stressors.find((s) => s.id === id);
}

function unavailableMetric<T>(
  reason: MetricUnavailableReason,
  explanation: string,
  missingFields?: readonly string[],
): MetricValue<T> {
  return {
    available: false,
    quality: 'MISSING',
    confidence: 0,
    reason,
    explanation,
    ...(missingFields ? { missingFields } : {}),
  };
}

function normalize01(value: number, min: number, max: number): number {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function bandToIntensity(band: string): number {
  switch (band) {
    case 'LOW':
      return 0.2;
    case 'MODERATE':
      return 0.45;
    case 'HIGH':
      return 0.7;
    case 'EXTREME':
      return 0.95;
    default:
      return 0.5;
  }
}

function observationRefsFromRecords(
  records: readonly EnvironmentalObservationRecord[],
  fields?: readonly string[],
): EnvironmentalStressObservationRef[] {
  const refs: EnvironmentalStressObservationRef[] = [];

  for (const record of records) {
    refs.push({ kind: 'RECORD', recordId: record.id });
    if (fields) {
      for (const field of fields) {
        refs.push({ kind: 'FIELD', recordId: record.id, field });
      }
    }
  }

  return refs;
}

function unavailableStress(
  applicability: EnvironmentalApplicability,
  suppressionReason: string | null,
): EnvironmentalStress {
  const missing = unavailableMetric<number>('NOT_APPLICABLE', 'Non applicable');

  const stressors: EnvironmentalStressor[] = KNOWN_STRESSOR_IDS.map((id) => ({
    id,
    intensity: missing,
    confidence: 0,
    supportingObservations: [],
    explanation: suppressionReason ?? 'Stress environnemental non applicable.',
  }));

  return {
    applicability,
    stressors: Object.freeze(stressors),
    compositeIntensity: missing,
    suppressionReason,
  };
}

function buildThermalStressor(input: {
  weather: WeatherMeasurements;
  exposure: ReturnType<typeof applicabilityToExposure>;
  partialFactor: number;
  records: readonly EnvironmentalObservationRecord[];
}): EnvironmentalStressor {
  const features = buildEnvironmentalFeatures(input.weather, input.exposure);
  const band = features.thermalStressBand;

  if (!band.available) {
    return {
      id: 'THERMAL',
      intensity: unavailableMetric('INSUFFICIENT_OBSERVATIONS', 'Stress thermique indisponible.'),
      confidence: 0,
      supportingObservations: observationRefsFromRecords(input.records, [
        'airTemperatureC',
        'relativeHumidityPct',
      ]),
      explanation: 'Données insuffisantes pour estimer le stress thermique.',
    };
  }

  const intensityValue = Math.round(bandToIntensity(band.value) * input.partialFactor * 100) / 100;

  return {
    id: 'THERMAL',
    intensity: {
      available: true,
      value: intensityValue,
      quality: band.quality,
      confidence: band.confidence * input.partialFactor,
      method: 'THERMAL_BAND_NORMALIZED',
      basedOn: band.basedOn,
    },
    confidence: band.confidence * input.partialFactor,
    supportingObservations: observationRefsFromRecords(input.records, band.basedOn),
    explanation: `Stress thermique ${band.value.toLowerCase()} (intensité ${intensityValue}).`,
  };
}

function buildWindStressor(input: {
  weather: WeatherMeasurements;
  partialFactor: number;
  records: readonly EnvironmentalObservationRecord[];
}): EnvironmentalStressor {
  const wind = input.weather.windSpeedMps;

  if (wind == null) {
    return {
      id: 'WIND',
      intensity: unavailableMetric(
        'MISSING_INPUT',
        'Impact vent indisponible : vitesse du vent absente.',
        ['windSpeedMps'],
      ),
      confidence: 0,
      supportingObservations: observationRefsFromRecords(input.records),
      explanation: 'Vitesse du vent non mesurée.',
    };
  }

  const intensityValue = Math.round(normalize01(wind, 0, 15) * input.partialFactor * 100) / 100;

  return {
    id: 'WIND',
    intensity: {
      available: true,
      value: intensityValue,
      quality: 'EXACT',
      confidence: 0.85 * input.partialFactor,
      method: 'WIND_SPEED_NORMALIZED',
      basedOn: ['windSpeedMps'],
    },
    confidence: 0.85 * input.partialFactor,
    supportingObservations: observationRefsFromRecords(input.records, ['windSpeedMps']),
    explanation: `Exposition au vent modérée à forte (intensité ${intensityValue}).`,
  };
}

function buildHydrationStressor(input: {
  weather: WeatherMeasurements;
  exposure: ReturnType<typeof applicabilityToExposure>;
  partialFactor: number;
  records: readonly EnvironmentalObservationRecord[];
}): EnvironmentalStressor {
  const features = buildEnvironmentalFeatures(input.weather, input.exposure);
  const proxy = features.heatIndexC.available
    ? features.heatIndexC
    : features.estimatedWetBulbC.available
      ? features.estimatedWetBulbC
      : null;

  if (!proxy) {
    return {
      id: 'HYDRATION',
      intensity: unavailableMetric(
        'INSUFFICIENT_OBSERVATIONS',
        'Demande hydratation indisponible.',
      ),
      confidence: 0,
      supportingObservations: observationRefsFromRecords(input.records),
      explanation: 'Données insuffisantes pour estimer la demande hydratation.',
    };
  }

  const range = features.heatIndexC.available ? { min: 25, max: 45 } : { min: 18, max: 30 };
  const intensityValue =
    Math.round(normalize01(proxy.value, range.min, range.max) * input.partialFactor * 100) / 100;

  return {
    id: 'HYDRATION',
    intensity: {
      available: true,
      value: intensityValue,
      quality: proxy.quality,
      confidence: proxy.confidence * input.partialFactor,
      method: features.heatIndexC.available
        ? 'HEAT_INDEX_HYDRATION_PROXY'
        : 'WET_BULB_HYDRATION_PROXY',
      basedOn: proxy.basedOn,
    },
    confidence: proxy.confidence * input.partialFactor,
    supportingObservations: observationRefsFromRecords(input.records, proxy.basedOn),
    explanation: `Demande hydratation élevée (intensité ${intensityValue}).`,
  };
}

function buildStubStressor(
  id: 'ALTITUDE' | 'AIR_QUALITY',
  explanation: string,
  records: readonly EnvironmentalObservationRecord[],
): EnvironmentalStressor {
  return {
    id,
    intensity: unavailableMetric('PROVIDER_DID_NOT_SUPPLY', explanation),
    confidence: 0,
    supportingObservations: observationRefsFromRecords(records),
    explanation,
  };
}

function buildCompositeIntensity(stressors: readonly EnvironmentalStressor[]): MetricValue<number> {
  const available = stressors.filter(
    (
      s,
    ): s is EnvironmentalStressor & {
      intensity: Extract<MetricValue<number>, { available: true }>;
    } => s.intensity.available,
  );

  if (available.length === 0) {
    return unavailableMetric('INSUFFICIENT_OBSERVATIONS', 'Intensité composite indisponible.');
  }

  const mean =
    Math.round(
      (available.reduce((sum, s) => sum + s.intensity.value, 0) / available.length) * 100,
    ) / 100;
  const meanConfidence =
    Math.round((available.reduce((sum, s) => sum + s.confidence, 0) / available.length) * 100) /
    100;

  return {
    available: true,
    value: mean,
    quality: 'ESTIMATED',
    confidence: meanConfidence,
    method: 'COMPOSITE_MEAN_AVAILABLE_STRESSORS',
    basedOn: available.map((s) => s.id),
  };
}

export function buildEnvironmentalStress(
  input: {
    applicability: EnvironmentalApplicability;
    weather: WeatherMeasurements;
    records?: readonly EnvironmentalObservationRecord[];
  } & BuildEnvironmentalStressOptions,
): EnvironmentalStress {
  const { applicability, weather } = input;
  void input.exposure;
  const records = input.records ?? [];

  if (!isEnvironmentApplicable(applicability)) {
    return unavailableStress(
      applicability,
      applicability === 'INDOOR'
        ? 'Activité en intérieur — la météo outdoor n’influence pas l’interprétation physiologique.'
        : 'Applicabilité environnementale insuffisante.',
    );
  }

  const exposure = applicabilityToExposure(applicability);
  const partialFactor = applicability === 'PARTIALLY_EXPOSED' ? 0.65 : 1;

  const stressors: EnvironmentalStressor[] = [
    buildThermalStressor({ weather, exposure, partialFactor, records }),
    buildWindStressor({ weather, partialFactor, records }),
    buildStubStressor('ALTITUDE', 'Dimension altitude non alimentée (stub Phase 1.5).', records),
    buildStubStressor(
      'AIR_QUALITY',
      'Dimension qualité de l’air non alimentée (stub Phase 1.5).',
      records,
    ),
    buildHydrationStressor({ weather, exposure, partialFactor, records }),
  ];

  return {
    applicability,
    stressors: Object.freeze(stressors),
    compositeIntensity: buildCompositeIntensity(stressors),
    suppressionReason: null,
  };
}

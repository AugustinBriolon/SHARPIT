/**
 * Context builders — Activity / Today / Forecast (environment-v1.1).
 */

import type {
  ActivityEnvironment,
  ActivityEnvironmentBinding,
  EnvironmentalApplicability,
  EnvironmentalDataCompleteness,
  EnvironmentalObservationRecord,
  EnvironmentalProviderId,
  ForecastEnvironment,
  GeoLocation,
  TodayEnvironment,
  WeatherField,
} from './types';
import type { ApplicabilityInput } from './applicability';
import { resolveEnvironmentalApplicability, isEnvironmentApplicable } from './applicability';
import { confidenceFromRecords } from './quality';
import { extractWeatherFromRecords, isRecordActive } from './record';
import { buildEnvironmentalStress } from './stress';
import { buildEnvironmentalImpact } from './impact';
import { buildActivityEnvironmentalCorrection } from './correction';

const CORE_WEATHER_FIELDS: WeatherField[] = [
  'airTemperatureC',
  'relativeHumidityPct',
  'windSpeedMps',
];

function activeRecords(
  records: readonly EnvironmentalObservationRecord[],
): EnvironmentalObservationRecord[] {
  return records.filter(isRecordActive);
}

function assessCompleteness(
  records: readonly EnvironmentalObservationRecord[],
): EnvironmentalDataCompleteness {
  const weather = extractWeatherFromRecords(records);
  const present = CORE_WEATHER_FIELDS.filter((f) => weather[f] != null).length;
  if (present === 0) return records.length === 0 ? 'NONE' : 'MINIMAL';
  if (present === CORE_WEATHER_FIELDS.length) return 'COMPLETE';
  if (present >= 2) return 'PARTIAL';
  return 'MINIMAL';
}

function pickLocation(
  records: readonly EnvironmentalObservationRecord[],
  fallback: GeoLocation,
): GeoLocation {
  const active = activeRecords(records);
  if (active.length === 0) return fallback;
  const sorted = [...active].sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
  return sorted[0].location;
}

function providerIdsFromRecords(
  records: readonly EnvironmentalObservationRecord[],
): EnvironmentalProviderId[] {
  return [
    ...new Set(
      activeRecords(records)
        .map((r) => r.providerId)
        .filter((id): id is EnvironmentalProviderId => id != null),
    ),
  ];
}

function buildStressAndImpact(input: {
  applicability: EnvironmentalApplicability;
  records: readonly EnvironmentalObservationRecord[];
}) {
  const active = activeRecords(input.records);
  const weather = extractWeatherFromRecords(active);
  const stress = buildEnvironmentalStress({
    applicability: input.applicability,
    weather,
    records: active,
  });
  const impact = buildEnvironmentalImpact({ stress });
  return { stress, impact };
}

export type BuildActivityEnvironmentInput = {
  readonly activityId: string;
  readonly athleteId: string;
  readonly window: { readonly start: Date; readonly end: Date };
  readonly location: GeoLocation;
  readonly records: readonly EnvironmentalObservationRecord[];
  readonly applicability: ApplicabilityInput;
  readonly boundAt?: Date;
  readonly computedAt?: Date;
};

export function buildActivityEnvironment(
  input: BuildActivityEnvironmentInput,
): ActivityEnvironment {
  const applicability = resolveEnvironmentalApplicability(input.applicability);
  const active = activeRecords(input.records);
  const binding: ActivityEnvironmentBinding = {
    activityId: input.activityId,
    recordIds: active.map((r) => r.id),
    boundAt: input.boundAt ?? input.computedAt ?? new Date(),
  };

  const { stress, impact } = buildStressAndImpact({ applicability, records: active });
  const correction = buildActivityEnvironmentalCorrection({
    activityId: input.activityId,
    stress,
    impact,
  });
  const dataCompleteness = isEnvironmentApplicable(applicability)
    ? assessCompleteness(active)
    : 'NONE';

  return {
    kind: 'ACTIVITY',
    activityId: input.activityId,
    athleteId: input.athleteId,
    window: input.window,
    applicability,
    location: pickLocation(active, input.location),
    records: Object.freeze([...active]),
    binding: Object.freeze(binding),
    stress,
    impact,
    correction,
    dataCompleteness,
    confidence: isEnvironmentApplicable(applicability) ? confidenceFromRecords(active) : 0,
    computedAt: input.computedAt ?? new Date(),
  };
}

export type BuildTodayEnvironmentInput = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly referenceAt: Date;
  readonly location: GeoLocation;
  readonly records: readonly EnvironmentalObservationRecord[];
  readonly applicability?: EnvironmentalApplicability;
  readonly computedAt?: Date;
};

export function buildTodayEnvironment(input: BuildTodayEnvironmentInput): TodayEnvironment {
  const active = activeRecords(input.records);
  const applicability = input.applicability ?? 'OUTDOOR';
  const { stress, impact } = buildStressAndImpact({ applicability, records: active });

  return {
    kind: 'TODAY',
    athleteId: input.athleteId,
    trainingDayId: input.trainingDayId,
    referenceAt: input.referenceAt,
    location: pickLocation(active, input.location),
    records: Object.freeze([...active]),
    stress,
    impact,
    dataCompleteness: assessCompleteness(active),
    confidence: confidenceFromRecords(active),
    providerIds: providerIdsFromRecords(active),
    computedAt: input.computedAt ?? new Date(),
  };
}

export type BuildForecastEnvironmentInput = {
  readonly athleteId: string;
  readonly targetWindow: { readonly start: Date; readonly end: Date };
  readonly location: GeoLocation;
  readonly predictions?: ForecastEnvironment['predictions'];
  readonly computedAt?: Date;
};

export function buildForecastEnvironment(
  input: BuildForecastEnvironmentInput,
): ForecastEnvironment {
  const predictions = input.predictions ?? [];
  const confidence =
    predictions.length > 0
      ? Math.round((predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length) * 100) /
        100
      : 0;

  const weather =
    predictions[0]?.payload.dimension === 'WEATHER' ? predictions[0].payload.data : {};

  const projectedStress = buildEnvironmentalStress({
    applicability: 'OUTDOOR',
    weather,
    records: [],
  });
  const projectedImpact = buildEnvironmentalImpact({ stress: projectedStress });

  return {
    kind: 'FORECAST',
    athleteId: input.athleteId,
    targetWindow: input.targetWindow,
    location: input.location,
    predictions: Object.freeze([...predictions]),
    projectedStress,
    projectedImpact,
    confidence,
    computedAt: input.computedAt ?? new Date(),
  };
}

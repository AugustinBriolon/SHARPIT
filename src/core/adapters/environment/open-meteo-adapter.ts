/**
 * ADAPTER — Open-Meteo hourly archive → ObservationRecordDraft[]
 */

import type { EnvironmentalProviderAdapter, AdapterMeta } from '@/core/environment/provider';
import type { WeatherMeasurements } from '@/core/environment/types';
import { weatherFieldQuality } from '@/core/environment/quality';
import type { ObservationRecordDraft } from '@/core/environment/record';

export type OpenMeteoHourlyPayload = {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m?: (number | null)[];
    apparent_temperature?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    dew_point_2m?: (number | null)[];
    precipitation?: (number | null)[];
    cloud_cover?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
    shortwave_radiation?: (number | null)[];
    uv_index?: (number | null)[];
    surface_pressure?: (number | null)[];
  };
};

function isOpenMeteoPayload(payload: unknown): payload is OpenMeteoHourlyPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  return Array.isArray((payload as OpenMeteoHourlyPayload).hourly?.time);
}

function toTrainingDayId(isoTime: string): string {
  return isoTime.slice(0, 10);
}

/**
 * Open-Meteo hourly labels are wall-clock strings in the requested timezone,
 * usually without an offset (`2026-07-26T14:00`). Parsing with `new Date(label)`
 * is host-TZ dependent (Paris laptop ≠ UTC Vercel) and shifts which hours fall
 * inside an activity window.
 *
 * Providers must request `timezone=UTC` so labels are absolute; we then parse
 * as UTC regardless of the Node process timezone.
 */
export function parseOpenMeteoHourlyTime(time: string, _timezone: string): Date {
  const trimmed = time.trim();
  if (!trimmed) {
    return new Date(Number.NaN);
  }

  if (/Z$/i.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;

  // Providers request timezone=UTC. Always treat offset-less labels as UTC so
  // parsing is identical on Europe/Paris hosts and UTC (Vercel) hosts.
  return new Date(`${withSeconds}Z`);
}

function hourlyValue(values: (number | null)[] | undefined, index: number): number | null {
  return values?.[index] ?? null;
}

function buildHourlyWeatherData(
  hourly: OpenMeteoHourlyPayload['hourly'],
  index: number,
): WeatherMeasurements {
  return {
    airTemperatureC: hourlyValue(hourly.temperature_2m, index),
    apparentTemperatureC: hourlyValue(hourly.apparent_temperature, index),
    relativeHumidityPct: hourlyValue(hourly.relative_humidity_2m, index),
    dewPointC: hourlyValue(hourly.dew_point_2m, index),
    precipitationMm: hourlyValue(hourly.precipitation, index),
    cloudCoverPct: hourlyValue(hourly.cloud_cover, index),
    windSpeedMps: hourlyValue(hourly.wind_speed_10m, index),
    windGustMps: hourlyValue(hourly.wind_gusts_10m, index),
    windDirectionDeg: hourlyValue(hourly.wind_direction_10m, index),
    solarRadiationWm2: hourlyValue(hourly.shortwave_radiation, index),
    uvIndex: hourlyValue(hourly.uv_index, index),
    atmosphericPressureHpa: hourlyValue(hourly.surface_pressure, index),
  };
}

type CreateWeatherDraftInput = {
  payload: OpenMeteoHourlyPayload;
  meta: AdapterMeta;
  data: WeatherMeasurements;
  observedAt: Date;
  timeLabel: string;
};

function createWeatherDraft(input: CreateWeatherDraftInput): ObservationRecordDraft {
  const { payload, meta, data, observedAt, timeLabel } = input;
  const externalId = `${meta.externalIdPrefix ?? 'open-meteo'}:${timeLabel}`;

  return {
    athleteId: meta.athleteId,
    dimension: 'WEATHER',
    payload: { dimension: 'WEATHER', data },
    observedAt,
    receivedAt: meta.receivedAt,
    trainingDayId: meta.trainingDayId ?? toTrainingDayId(timeLabel),
    temporalScope: 'INTERVAL',
    intervalStart: observedAt,
    intervalEnd: new Date(observedAt.getTime() + 3_600_000),
    exposure: 'OUTDOOR',
    location: {
      latitude: meta.location.latitude ?? payload.latitude,
      longitude: meta.location.longitude ?? payload.longitude,
      altitudeM: meta.location.altitudeM ?? null,
      label: meta.location.label ?? null,
    },
    source: 'PROVIDER',
    providerId: 'open-meteo',
    externalId,
    providerSnapshot: meta.providerSnapshot,
    fieldQuality: weatherFieldQuality(data, 'open-meteo'),
  };
}

function buildHourlyDraft(
  payload: OpenMeteoHourlyPayload,
  meta: AdapterMeta,
  index: number,
): ObservationRecordDraft | null {
  const data = buildHourlyWeatherData(payload.hourly, index);
  if (!Object.values(data).some((value) => (value !== undefined && value !== null))) {
    return null;
  }

  const timeLabel = payload.hourly.time[index];
  const observedAt = parseOpenMeteoHourlyTime(timeLabel, payload.timezone);
  if (Number.isNaN(observedAt.getTime())) {
    return null;
  }

  return createWeatherDraft({ payload, meta, data, observedAt, timeLabel });
}

export const openMeteoEnvironmentalAdapter: EnvironmentalProviderAdapter = {
  providerId: 'open-meteo',

  adapt(payload: unknown, meta: AdapterMeta): ObservationRecordDraft[] {
    if (!isOpenMeteoPayload(payload)) {
      return [];
    }

    const drafts: ObservationRecordDraft[] = [];
    for (let i = 0; i < payload.hourly.time.length; i++) {
      const draft = buildHourlyDraft(payload, meta, i);
      if (draft) {
        drafts.push(draft);
      }
    }

    return drafts;
  },
};

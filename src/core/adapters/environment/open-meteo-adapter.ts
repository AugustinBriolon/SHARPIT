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
  if (!payload || typeof payload !== 'object') return false;
  return Array.isArray((payload as OpenMeteoHourlyPayload).hourly?.time);
}

function toTrainingDayId(isoTime: string): string {
  return isoTime.slice(0, 10);
}

export const openMeteoEnvironmentalAdapter: EnvironmentalProviderAdapter = {
  providerId: 'open-meteo',

  adapt(payload: unknown, meta: AdapterMeta): ObservationRecordDraft[] {
    if (!isOpenMeteoPayload(payload)) return [];

    const { hourly, latitude, longitude } = payload;
    const drafts: ObservationRecordDraft[] = [];

    for (let i = 0; i < hourly.time.length; i++) {
      const data: WeatherMeasurements = {
        airTemperatureC: hourly.temperature_2m?.[i] ?? null,
        apparentTemperatureC: hourly.apparent_temperature?.[i] ?? null,
        relativeHumidityPct: hourly.relative_humidity_2m?.[i] ?? null,
        dewPointC: hourly.dew_point_2m?.[i] ?? null,
        precipitationMm: hourly.precipitation?.[i] ?? null,
        cloudCoverPct: hourly.cloud_cover?.[i] ?? null,
        windSpeedMps: hourly.wind_speed_10m?.[i] ?? null,
        windGustMps: hourly.wind_gusts_10m?.[i] ?? null,
        windDirectionDeg: hourly.wind_direction_10m?.[i] ?? null,
        solarRadiationWm2: hourly.shortwave_radiation?.[i] ?? null,
        uvIndex: hourly.uv_index?.[i] ?? null,
        atmosphericPressureHpa: hourly.surface_pressure?.[i] ?? null,
      };

      const hasAny = Object.values(data).some((v) => v != null);
      if (!hasAny) continue;

      const observedAt = new Date(hourly.time[i]);
      const externalId = `${meta.externalIdPrefix ?? 'open-meteo'}:${hourly.time[i]}`;

      drafts.push({
        athleteId: meta.athleteId,
        dimension: 'WEATHER',
        payload: { dimension: 'WEATHER', data },
        observedAt,
        receivedAt: meta.receivedAt,
        trainingDayId: meta.trainingDayId ?? toTrainingDayId(hourly.time[i]),
        temporalScope: 'INTERVAL',
        intervalStart: observedAt,
        intervalEnd: new Date(observedAt.getTime() + 3_600_000),
        exposure: 'OUTDOOR',
        location: {
          latitude: meta.location.latitude ?? latitude,
          longitude: meta.location.longitude ?? longitude,
          altitudeM: meta.location.altitudeM ?? null,
          label: meta.location.label ?? null,
        },
        source: 'PROVIDER',
        providerId: 'open-meteo',
        externalId,
        providerSnapshot: meta.providerSnapshot,
        fieldQuality: weatherFieldQuality(data, 'open-meteo'),
      });
    }

    return drafts;
  },
};

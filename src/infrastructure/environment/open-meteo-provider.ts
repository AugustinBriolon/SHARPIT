/**
 * Open-Meteo provider — infrastructure implementation of EnvironmentalProvider.
 * Graceful degradation on any failure.
 */

import type {
  EnvironmentalProvider,
  EnvironmentalFetchRequest,
  EnvironmentalProviderResult,
  ProviderAvailabilityContext,
} from '@/core/environment/provider';

const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'dew_point_2m',
  'precipitation',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'shortwave_radiation',
  'uv_index',
  'surface_pressure',
].join(',');

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export type OpenMeteoProviderOptions = {
  readonly fetchFn?: typeof fetch;
  readonly enabled?: boolean;
};

export function createOpenMeteoEnvironmentalProvider(
  options: OpenMeteoProviderOptions = {},
): EnvironmentalProvider {
  const fetchFn = options.fetchFn ?? fetch;
  const enabled = options.enabled ?? true;

  return {
    id: 'open-meteo',
    priority: 10,

    isAvailable(context: ProviderAvailabilityContext): boolean {
      if (!enabled) return false;
      return isValidCoordinate(context.location.latitude, context.location.longitude);
    },

    async fetch(request: EnvironmentalFetchRequest): Promise<EnvironmentalProviderResult> {
      if (!enabled) {
        return {
          status: 'unavailable',
          providerId: 'open-meteo',
          reason: 'PROVIDER_DISABLED',
          message: 'Open-Meteo provider is disabled',
          retryable: false,
        };
      }

      const { latitude, longitude } = request.location;
      if (!isValidCoordinate(latitude, longitude)) {
        return {
          status: 'unavailable',
          providerId: 'open-meteo',
          reason: 'INVALID_LOCATION',
          message: 'Coordinates out of range',
          retryable: false,
        };
      }

      const start = formatDate(request.from);
      const end = formatDate(request.to);
      const url =
        `${OPEN_METEO_ARCHIVE}?latitude=${latitude}&longitude=${longitude}` +
        `&start_date=${start}&end_date=${end}` +
        `&hourly=${HOURLY_FIELDS}&timezone=UTC`;

      try {
        const response = await fetchFn(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15_000),
        });

        if (response.status === 429) {
          return {
            status: 'unavailable',
            providerId: 'open-meteo',
            reason: 'RATE_LIMITED',
            message: 'Open-Meteo rate limit exceeded',
            retryable: true,
          };
        }

        if (!response.ok) {
          return {
            status: 'unavailable',
            providerId: 'open-meteo',
            reason: 'NETWORK_ERROR',
            message: `Open-Meteo HTTP ${response.status}`,
            retryable: response.status >= 500,
          };
        }

        const payload = await response.json();
        return {
          status: 'success',
          providerId: 'open-meteo',
          payload,
          fetchedAt: new Date(),
          cacheHit: false,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Open-Meteo fetch failed';
        return {
          status: 'unavailable',
          providerId: 'open-meteo',
          reason: 'NETWORK_ERROR',
          message,
          retryable: true,
        };
      }
    },
  };
}

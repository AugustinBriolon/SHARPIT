import type { EnvironmentalPrediction } from '@/core/environment';
import type { WeatherMeasurements } from '@/core/environment/types';
import type { LucideIcon } from 'lucide-react';
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSun, Sun } from 'lucide-react';

export type ActivityWeatherCondition =
  'clear' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'drizzle' | 'rain' | 'unknown';

export type ActivityWeatherSnapshot = {
  city: string;
  avgTempC: number;
  condition: ActivityWeatherCondition;
};

const WEATHER_STORAGE_VERSION = 3 as const;

type StoredActivityWeather = ActivityWeatherSnapshot & { v: typeof WEATHER_STORAGE_VERSION };

export function readWeatherMeasurements(
  prediction: EnvironmentalPrediction,
): WeatherMeasurements | null {
  const payload = prediction.payload as
    { dimension?: string; data?: WeatherMeasurements } | WeatherMeasurements;

  if (payload && typeof payload === 'object' && 'dimension' in payload && payload.data) {
    return payload.data;
  }

  return payload as WeatherMeasurements;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Extrait un libellé ville court depuis une adresse géocodée. */
export function formatCityFromLocationLabel(label: string): string {
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return label.trim();
  if (parts.length === 1) return parts[0];

  const last = parts[parts.length - 1];
  if (/^\d{5}(?:\s|$)/.test(last) && parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return last;
}

export function inferActivityWeatherCondition(input: {
  maxPrecipitationMm: number | null;
  avgPrecipitationMm: number | null;
  avgCloudCoverPct: number | null;
  avgSolarRadiationWm2: number | null;
}): ActivityWeatherCondition {
  const maxPrecip = input.maxPrecipitationMm ?? 0;
  const avgPrecip = input.avgPrecipitationMm ?? 0;

  // Open-Meteo remonte parfois 0.1–0.7 mm sur des créneaux secs : seuils conservateurs.
  if (maxPrecip >= 1.5 || avgPrecip >= 0.4) return 'rain';
  if (maxPrecip >= 0.8 && avgPrecip >= 0.15) return 'drizzle';

  const cloud = input.avgCloudCoverPct;
  const solar = input.avgSolarRadiationWm2;

  if (solar != null && solar >= 350 && (cloud == null || cloud < 45)) return 'clear';
  if (cloud == null) return solar != null && solar >= 250 ? 'clear' : 'unknown';
  if (cloud >= 85) return 'overcast';
  if (cloud >= 55) return 'cloudy';
  if (cloud >= 25) return 'partly-cloudy';
  return 'clear';
}

export function extractActivityWeatherSnapshot(
  predictions: EnvironmentalPrediction[],
  locationLabel: string | null,
): ActivityWeatherSnapshot | null {
  const city = locationLabel?.trim();
  if (!city) return null;
  const displayCity = formatCityFromLocationLabel(city);

  const temperatures: number[] = [];
  const cloudSamples: number[] = [];
  const precipSamples: number[] = [];
  const solarSamples: number[] = [];
  let maxPrecipitationMm: number | null = null;

  for (const prediction of predictions) {
    if (prediction.dimension !== 'WEATHER') continue;
    const data = readWeatherMeasurements(prediction);
    if (!data) continue;

    if (data.airTemperatureC != null) temperatures.push(data.airTemperatureC);
    if (data.cloudCoverPct != null) cloudSamples.push(data.cloudCoverPct);
    if (data.precipitationMm != null) {
      precipSamples.push(data.precipitationMm);
      maxPrecipitationMm = Math.max(maxPrecipitationMm ?? 0, data.precipitationMm);
    }
    if (data.solarRadiationWm2 != null) solarSamples.push(data.solarRadiationWm2);
  }

  const avgTempC = average(temperatures);
  if (avgTempC == null) return null;

  return {
    city: displayCity,
    avgTempC,
    condition: inferActivityWeatherCondition({
      maxPrecipitationMm,
      avgPrecipitationMm: average(precipSamples),
      avgCloudCoverPct: average(cloudSamples),
      avgSolarRadiationWm2: average(solarSamples),
    }),
  };
}

export function serializeActivityWeather(snapshot: ActivityWeatherSnapshot): string {
  const stored: StoredActivityWeather = {
    v: WEATHER_STORAGE_VERSION,
    city: formatCityFromLocationLabel(snapshot.city),
    avgTempC: snapshot.avgTempC,
    condition: snapshot.condition,
  };
  return JSON.stringify(stored);
}

function parseLegacyWeather(raw: string): ActivityWeatherSnapshot | null {
  const segments = raw
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;

  const tempMatch = raw.match(/(-?\d+(?:[.,]\d+)?)\s*°C/i);
  const avgTempC = tempMatch ? Number(tempMatch[1].replace(',', '.')) : null;
  if (avgTempC == null || !Number.isFinite(avgTempC)) return null;

  const [city] = segments;

  const lower = raw.toLowerCase();
  let condition: ActivityWeatherCondition = 'unknown';
  if (/pluie|averses|orage/.test(lower)) condition = 'rain';
  else if (/bruine/.test(lower)) condition = 'drizzle';
  else if (/couvert|brouillard/.test(lower)) condition = 'overcast';
  else if (/nuage|cloud/.test(lower)) condition = 'cloudy';
  else if (/éclaircies|partiellement|variable/.test(lower)) condition = 'partly-cloudy';
  else if (/soleil|dégagé|clear|ensoleill/.test(lower)) condition = 'clear';

  return { city, avgTempC, condition };
}

function parseStoredWeather(raw: string): ActivityWeatherSnapshot | null {
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredActivityWeather> & { v?: number };
      if (
        typeof parsed.v === 'number' &&
        typeof parsed.city === 'string' &&
        typeof parsed.avgTempC === 'number' &&
        typeof parsed.condition === 'string'
      ) {
        return {
          city: parsed.city,
          avgTempC: parsed.avgTempC,
          condition: parsed.condition as ActivityWeatherCondition,
        };
      }
    } catch {
      return null;
    }
  }

  return parseLegacyWeather(raw);
}

export function parseActivityWeather(
  raw: string | null | undefined,
): ActivityWeatherSnapshot | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const parsed = parseStoredWeather(trimmed);
  if (!parsed) return null;

  return {
    ...parsed,
    city: formatCityFromLocationLabel(parsed.city),
  };
}

/** Weather field exists but is not displayable or uses an outdated snapshot version. */
export function needsWeatherEnrichment(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true;

  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { v?: number; city?: string };
      if (parsed.v !== WEATHER_STORAGE_VERSION) return true;
      if (typeof parsed.city === 'string' && parsed.city.includes(',')) return true;
      return false;
    } catch {
      return true;
    }
  }

  return parseStoredWeather(trimmed) == null;
}

export function formatActivityWeatherChip(snapshot: ActivityWeatherSnapshot): string {
  const city = formatCityFromLocationLabel(snapshot.city.split('·')[0]?.trim() ?? snapshot.city);
  return `${city} · ${Math.round(snapshot.avgTempC)}°C`;
}

export function formatActivityWeatherNarrative(snapshot: ActivityWeatherSnapshot): string {
  const labels: Record<ActivityWeatherCondition, string> = {
    clear: 'dégagé',
    'partly-cloudy': 'partiellement nuageux',
    cloudy: 'nuageux',
    overcast: 'couvert',
    drizzle: 'bruine',
    rain: 'pluie',
    unknown: 'conditions variables',
  };
  return `${snapshot.city} · ${Math.round(snapshot.avgTempC)}°C · ${labels[snapshot.condition]}`;
}

export function activityWeatherIcon(condition: ActivityWeatherCondition): LucideIcon {
  switch (condition) {
    case 'clear':
      return Sun;
    case 'partly-cloudy':
      return CloudSun;
    case 'cloudy':
      return Cloud;
    case 'overcast':
      return CloudFog;
    case 'drizzle':
      return CloudDrizzle;
    case 'rain':
      return CloudRain;
    default:
      return CloudSun;
  }
}

export function activityWeatherIconClassName(condition: ActivityWeatherCondition): string {
  switch (condition) {
    case 'clear':
      return 'text-amber-500';
    case 'partly-cloudy':
      return 'text-sky-500';
    case 'cloudy':
    case 'overcast':
      return 'text-muted-foreground';
    case 'drizzle':
    case 'rain':
      return 'text-blue-500';
    default:
      return 'text-muted-foreground';
  }
}

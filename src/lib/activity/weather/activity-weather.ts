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

/** Bumped when weather hour parsing became UTC-deterministic (prod/dev parity). */
const WEATHER_STORAGE_VERSION = 4 as const;

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
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Extrait un libellé ville court depuis une adresse géocodée. */
export function formatCityFromLocationLabel(label: string): string {
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return label.trim();
  }
  if (parts.length === 1) {
    return parts[0];
  }

  const last = parts[parts.length - 1];
  if (/^\d{5}(?:\s|$)/.test(last) && parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return last;
}

function precipCondition(maxPrecip: number, avgPrecip: number): ActivityWeatherCondition | null {
  if (maxPrecip >= 1.5 || avgPrecip >= 0.4) {
    return 'rain';
  }
  if (maxPrecip >= 0.8 && avgPrecip >= 0.15) {
    return 'drizzle';
  }
  return null;
}

const CLOUD_COVER_CONDITIONS: Array<{ min: number; condition: ActivityWeatherCondition }> = [
  { min: 85, condition: 'overcast' },
  { min: 55, condition: 'cloudy' },
  { min: 25, condition: 'partly-cloudy' },
];

function cloudConditionFromCover(cloud: number): ActivityWeatherCondition {
  return CLOUD_COVER_CONDITIONS.find(({ min }) => cloud >= min)?.condition ?? 'clear';
}

function cloudCondition(cloud: number | null, solar: number | null): ActivityWeatherCondition {
  if ((solar !== undefined && solar !== null) && solar >= 350 && ((cloud === undefined || cloud === null) || cloud < 45)) {
    return 'clear';
  }
  if ((cloud === undefined || cloud === null)) {
    return (solar !== undefined && solar !== null) && solar >= 250 ? 'clear' : 'unknown';
  }
  return cloudConditionFromCover(cloud);
}

export function inferActivityWeatherCondition(input: {
  maxPrecipitationMm: number | null;
  avgPrecipitationMm: number | null;
  avgCloudCoverPct: number | null;
  avgSolarRadiationWm2: number | null;
}): ActivityWeatherCondition {
  const maxPrecip = input.maxPrecipitationMm ?? 0;
  const avgPrecip = input.avgPrecipitationMm ?? 0;
  const fromPrecip = precipCondition(maxPrecip, avgPrecip);
  if (fromPrecip) {
    return fromPrecip;
  }
  return cloudCondition(input.avgCloudCoverPct, input.avgSolarRadiationWm2);
}

function appendWeatherSample(
  data: WeatherMeasurements,
  samples: {
    temperatures: number[];
    cloudSamples: number[];
    precipSamples: number[];
    solarSamples: number[];
    maxPrecipitationMm: number | null;
  },
): void {
  if ((data.airTemperatureC !== undefined && data.airTemperatureC !== null)) {
    samples.temperatures.push(data.airTemperatureC);
  }
  if ((data.cloudCoverPct !== undefined && data.cloudCoverPct !== null)) {
    samples.cloudSamples.push(data.cloudCoverPct);
  }
  if ((data.precipitationMm !== undefined && data.precipitationMm !== null)) {
    samples.precipSamples.push(data.precipitationMm);
    samples.maxPrecipitationMm = Math.max(samples.maxPrecipitationMm ?? 0, data.precipitationMm);
  }
  if ((data.solarRadiationWm2 !== undefined && data.solarRadiationWm2 !== null)) {
    samples.solarSamples.push(data.solarRadiationWm2);
  }
}

function collectWeatherSamples(predictions: EnvironmentalPrediction[]) {
  const samples = {
    temperatures: [] as number[],
    cloudSamples: [] as number[],
    precipSamples: [] as number[],
    solarSamples: [] as number[],
    maxPrecipitationMm: null as number | null,
  };

  for (const prediction of predictions) {
    if (prediction.dimension !== 'WEATHER') {
      continue;
    }
    const data = readWeatherMeasurements(prediction);
    if (!data) {
      continue;
    }
    appendWeatherSample(data, samples);
  }

  return samples;
}

export function extractActivityWeatherSnapshot(
  predictions: EnvironmentalPrediction[],
  locationLabel: string | null,
): ActivityWeatherSnapshot | null {
  const city = locationLabel?.trim();
  if (!city) {
    return null;
  }

  const samples = collectWeatherSamples(predictions);
  const avgTempC = average(samples.temperatures);
  if ((avgTempC === undefined || avgTempC === null)) {
    return null;
  }

  return {
    city: formatCityFromLocationLabel(city),
    avgTempC,
    condition: inferActivityWeatherCondition({
      maxPrecipitationMm: samples.maxPrecipitationMm,
      avgPrecipitationMm: average(samples.precipSamples),
      avgCloudCoverPct: average(samples.cloudSamples),
      avgSolarRadiationWm2: average(samples.solarSamples),
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

const LEGACY_CONDITION_RULES: Array<{ pattern: RegExp; condition: ActivityWeatherCondition }> = [
  { pattern: /pluie|averses|orage/, condition: 'rain' },
  { pattern: /bruine/, condition: 'drizzle' },
  { pattern: /couvert|brouillard/, condition: 'overcast' },
  { pattern: /nuage|cloud/, condition: 'cloudy' },
  { pattern: /éclaircies|partiellement|variable/, condition: 'partly-cloudy' },
  { pattern: /soleil|dégagé|clear|ensoleill/, condition: 'clear' },
];

function legacyConditionFromText(raw: string): ActivityWeatherCondition {
  const lower = raw.toLowerCase();
  for (const rule of LEGACY_CONDITION_RULES) {
    if (rule.pattern.test(lower)) {
      return rule.condition;
    }
  }
  return 'unknown';
}

function parseLegacyWeather(raw: string): ActivityWeatherSnapshot | null {
  const segments = raw
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const tempMatch = raw.match(/(-?\d+(?:[.,]\d+)?)\s*°C/i);
  const avgTempC = tempMatch ? Number(tempMatch[1].replace(',', '.')) : null;
  if ((avgTempC === undefined || avgTempC === null) || !Number.isFinite(avgTempC)) {
    return null;
  }

  const [city] = segments;
  return { city, avgTempC, condition: legacyConditionFromText(raw) };
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
  if (!trimmed) {
    return null;
  }

  const parsed = parseStoredWeather(trimmed);
  if (!parsed) {
    return null;
  }

  return {
    ...parsed,
    city: formatCityFromLocationLabel(parsed.city),
  };
}

/** Weather field exists but is not displayable or uses an outdated snapshot version. */
export function needsWeatherEnrichment(raw: string | null | undefined): boolean {
  if (!raw?.trim()) {
    return true;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { v?: number; city?: string };
      if (parsed.v !== WEATHER_STORAGE_VERSION) {
        return true;
      }
      if (typeof parsed.city === 'string' && parsed.city.includes(',')) {
        return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  return parseStoredWeather(trimmed) === null;
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
      return 'text-signal-threshold';
    case 'partly-cloudy':
      return 'text-signal-tempo';
    case 'cloudy':
    case 'overcast':
      return 'text-muted-foreground';
    case 'drizzle':
    case 'rain':
      return 'text-signal-recovery';
    default:
      return 'text-muted-foreground';
  }
}

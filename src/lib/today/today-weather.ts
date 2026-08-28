/**
 * Today's weather for the morning screen.
 *
 * Reuses the activity condition thresholds and city formatting so a forecast and
 * a realised session read alike — but not the activity averaging. An activity
 * averages over the effort it actually covered; a header answers "what am I
 * walking into now", and a mean is the wrong answer to that question.
 *
 * Carries `locationKnown`. The location chain ends on hard-coded coordinates when
 * nothing is configured, and weather for a city the athlete does not live in must
 * not be presented as a fact about their morning.
 *
 * Reads the athlete's own place — travel context, else home — rather than the
 * GPS chain an activity uses. A header answers "what am I walking into", asked
 * from where the athlete is standing, not from the midpoint of this morning's
 * run. That chain also answers with bare coordinates, and a reading with no
 * name is still a reading.
 */
import { endOfDay, startOfDay } from 'date-fns';
import { isSet } from '@/lib/util/value';
import type { EnvironmentalPrediction } from '@/core/environment';
import {
  formatCityFromLocationLabel,
  inferActivityWeatherCondition,
  readWeatherMeasurements,
  type ActivityWeatherCondition,
} from '@/lib/activity/weather/activity-weather';
import { resolveDefaultActivityLocation } from '@/lib/geocoding/default-activity-location';
import { fetchForecastPredictions } from '@/lib/planned-session/forecast/forecast-fetch';
import { prisma } from '@/lib/prisma';
import { approximateTrainingDayUtcRange } from '@/lib/training/training-day';

export type TodayWeather = {
  city: string;
  /** Temperature at the hour nearest now, not a daily mean. */
  tempC: number;
  condition: ActivityWeatherCondition;
  locationKnown: boolean;
};

/** One forecast hour, reduced to what the header needs. */
export type WeatherHour = {
  at: Date;
  airTemperatureC: number | null;
  precipitationMm: number | null;
  cloudCoverPct: number | null;
  solarRadiationWm2: number | null;
};

function predictionTargetAt(prediction: EnvironmentalPrediction): Date | null {
  if (!prediction.targetAt) {
    return null;
  }
  const at = new Date(prediction.targetAt);
  return Number.isNaN(at.getTime()) ? null : at;
}

function mapPredictionToWeatherHour(prediction: EnvironmentalPrediction): WeatherHour[] {
  const data = readWeatherMeasurements(prediction);
  const at = predictionTargetAt(prediction);
  if (!data || !at) {
    return [];
  }
  return [
    {
      at,
      airTemperatureC: data.airTemperatureC ?? null,
      precipitationMm: data.precipitationMm ?? null,
      cloudCoverPct: data.cloudCoverPct ?? null,
      solarRadiationWm2: data.solarRadiationWm2 ?? null,
    },
  ];
}

export function toWeatherHours(predictions: EnvironmentalPrediction[]): WeatherHour[] {
  return predictions
    .filter((prediction) => prediction.dimension === 'WEATHER')
    .flatMap(mapPredictionToWeatherHour)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Temperature now, condition for what is left of the day.
 *
 * The provider is queried over a padded range so time zones cannot clip the day;
 * everything outside the athlete's actual day is dropped here. Late in the
 * evening nothing remains ahead, so the condition falls back to the whole day
 * rather than reporting nothing.
 */
export function selectTodayWeather(
  hours: WeatherHour[],
  now: Date,
): { tempC: number; condition: ActivityWeatherCondition } | null {
  const dayStart = startOfDay(now).getTime();
  const dayEnd = endOfDay(now).getTime();
  const today = hours.filter((hour) => {
    const time = hour.at.getTime();
    return time >= dayStart && time <= dayEnd;
  });
  if (today.length === 0) {
    return null;
  }

  const withTemp = today.filter((hour) => isSet(hour.airTemperatureC));
  if (withTemp.length === 0) {
    return null;
  }

  const nearest = withTemp.reduce((best, hour) =>
    Math.abs(hour.at.getTime() - now.getTime()) < Math.abs(best.at.getTime() - now.getTime())
      ? hour
      : best,
  );

  const ahead = today.filter((hour) => hour.at.getTime() >= now.getTime());
  const forCondition = ahead.length > 0 ? ahead : today;

  const precipitations = forCondition
    .map((hour) => hour.precipitationMm)
    .filter((value): value is number => isSet(value));

  return {
    tempC: nearest.airTemperatureC as number,
    condition: inferActivityWeatherCondition({
      maxPrecipitationMm: precipitations.length > 0 ? Math.max(...precipitations) : null,
      avgPrecipitationMm: mean(precipitations),
      avgCloudCoverPct: mean(
        forCondition
          .map((hour) => hour.cloudCoverPct)
          .filter((value): value is number => isSet(value)),
      ),
      avgSolarRadiationWm2: mean(
        forCondition
          .map((hour) => hour.solarRadiationWm2)
          .filter((value): value is number => isSet(value)),
      ),
    }),
  };
}

/**
 * How the header names where the reading was taken.
 *
 * A place we cannot name is not a reason to withhold the temperature — it is the
 * reason `locationKnown` exists, and the header offers to fix it instead of
 * going blank. Hard-coded coordinates stay unnamed however good their label
 * looks: `default` means nothing was configured.
 */
export function nameWeatherLocation(location: { label?: string | null; source: string }): {
  city: string;
  locationKnown: boolean;
} {
  const city = location.label?.trim();
  if (!city || location.source === 'default') {
    return { city: '', locationKnown: false };
  }
  return { city: formatCityFromLocationLabel(city), locationKnown: true };
}

export async function loadTodayWeather(
  athleteId: string,
  trainingDayId: string,
): Promise<TodayWeather | null> {
  try {
    const { gte: windowStart, lte: windowEnd } = approximateTrainingDayUtcRange(trainingDayId);
    const location = await resolveDefaultActivityLocation(prisma, athleteId, windowStart);

    const { predictions } = await fetchForecastPredictions({
      location,
      windowStart,
      windowEnd,
      athleteId,
      trainingDayId,
    });

    const selected = selectTodayWeather(toWeatherHours(predictions), new Date());
    if (!selected) {
      return null;
    }

    return {
      ...nameWeatherLocation(location),
      tempC: selected.tempC,
      condition: selected.condition,
    };
  } catch {
    // The morning screen must render without a forecast provider.
    return null;
  }
}

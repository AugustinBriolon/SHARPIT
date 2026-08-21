/**
 * Today's weather for the morning screen.
 *
 * Reuses the activity weather extractor so a forecast and a realised session
 * read the same way — same condition thresholds, same city formatting.
 *
 * Carries `locationKnown`. The location chain ends on hard-coded coordinates
 * when nothing is configured, and weather for a city the athlete does not live
 * in must not be presented as a fact about their morning.
 */
import {
  extractActivityWeatherSnapshot,
  type ActivityWeatherSnapshot,
} from '@/lib/activity/weather/activity-weather';
import { resolveAthleteGeoLocation } from '@/lib/environment/athlete-location';
import { fetchForecastPredictions } from '@/lib/planned-session/forecast/forecast-fetch';
import { prisma } from '@/lib/prisma';
import { approximateTrainingDayUtcRange } from '@/lib/training/training-day';

const ATHLETE_ID = 'default';

export type TodayWeather = ActivityWeatherSnapshot & {
  /** False when the reading is for hard-coded coordinates, not a place we know. */
  locationKnown: boolean;
};

export async function loadTodayWeather(trainingDayId: string): Promise<TodayWeather | null> {
  try {
    const location = await resolveAthleteGeoLocation(prisma, ATHLETE_ID, trainingDayId);
    const { gte: windowStart, lte: windowEnd } = approximateTrainingDayUtcRange(trainingDayId);

    const { predictions } = await fetchForecastPredictions({
      location,
      windowStart,
      windowEnd,
      athleteId: ATHLETE_ID,
      trainingDayId,
    });

    const snapshot = extractActivityWeatherSnapshot(predictions, location.label ?? null);
    if (!snapshot) return null;

    return { ...snapshot, locationKnown: location.source !== 'default' };
  } catch {
    // The morning screen must render without a forecast provider.
    return null;
  }
}

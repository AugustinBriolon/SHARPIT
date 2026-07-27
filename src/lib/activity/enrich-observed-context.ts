import { startOfDay, addDays } from 'date-fns';
import type { PrismaClient } from '@prisma/client';
import { type ActivityType } from '@prisma/client';
import { isActivityToday } from '@/lib/activity/activity-day';
import { backfillActivityObservedLocation } from '@/lib/activity/observed-location';
import { activityWeatherWindow } from '@/lib/activity/activity-weather-window';
import {
  extractActivityWeatherSnapshot,
  needsWeatherEnrichment,
  serializeActivityWeather,
} from '@/lib/activity/activity-weather';
import { isIndoorActivitySession } from '@/lib/activity/indoor-activity';
import { runActivityNarrativeAnalysis } from '@/lib/activity/activity-narrative';
import { fetchForecastPredictions } from '@/lib/planned-session/forecast-fetch';
import { computeTrainingDayId } from '@/lib/training/training-day';

export { isActivityToday } from '@/lib/activity/activity-day';

const OUTDOOR_TYPES = new Set<ActivityType>(['RUN', 'BIKE', 'SWIM', 'TRIATHLON']);

/**
 * Auto narrative from enrich is today-only (ingest / same-day context refresh).
 * Older activities: no auto work — athlete can request synthesis from the UI.
 */
export function shouldRefreshActivityNarrative(input: {
  force?: boolean;
  isToday: boolean;
  hasNarrative: boolean;
  weatherUpdated: boolean;
  locationNew: boolean;
}): boolean {
  if (input.force) return true;
  if (!input.isToday) return false;
  if (!input.hasNarrative) return true;
  return input.weatherUpdated || input.locationNew;
}

export async function enrichActivityObservedContext(
  prisma: PrismaClient,
  activityId: string,
  options?: { forceNarrative?: boolean },
): Promise<{ weatherUpdated: boolean; narrativeRefreshed: boolean }> {
  let weatherUpdated = false;
  let narrativeRefreshed = false;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      type: true,
      title: true,
      notes: true,
      date: true,
      duration: true,
      weather: true,
      narrativeAnalyzedAt: true,
      observedLocationLabel: true,
      observedLocationLat: true,
      observedLocationLng: true,
    },
  });

  if (!activity || !OUTDOOR_TYPES.has(activity.type)) {
    return { weatherUpdated, narrativeRefreshed };
  }

  const isToday = isActivityToday(activity.date);
  const hasNarrative = Boolean(activity.narrativeAnalyzedAt);

  // Historical browse / late sync of old sessions: never auto-fetch weather or narrative.
  // Ingest of today's sessions + enrichTodayActivitiesContext remain the only paths.
  if (!isToday && !options?.forceNarrative) {
    return { weatherUpdated, narrativeRefreshed };
  }

  // Indoor / virtual / trainer — never fetch outdoor weather (Zwift GPS ≠ outdoor).
  // Clear any previously persisted outdoor snapshot so coach narratives stay honest.
  if (isIndoorActivitySession(activity)) {
    if (activity.weather) {
      await prisma.activity.update({
        where: { id: activityId },
        data: { weather: null },
      });
      weatherUpdated = true;
    }

    const shouldRefresh = shouldRefreshActivityNarrative({
      force: options?.forceNarrative,
      isToday,
      hasNarrative,
      weatherUpdated,
      locationNew: false,
    });

    if (shouldRefresh) {
      // Never clear narrative before success — a failed LLM would leave a forever-pending UI.
      narrativeRefreshed = await runActivityNarrativeAnalysis(activityId, {
        force: Boolean(options?.forceNarrative) || (hasNarrative && isToday && weatherUpdated),
      });
    }

    return { weatherUpdated, narrativeRefreshed };
  }

  // Manual / forced narrative on a historical outdoor session: no weather backfill.
  if (!isToday) {
    narrativeRefreshed = await runActivityNarrativeAnalysis(activityId, { force: true });
    return { weatherUpdated, narrativeRefreshed };
  }

  const priorCoords =
    activity.observedLocationLat != null && activity.observedLocationLng != null
      ? {
          latitude: activity.observedLocationLat,
          longitude: activity.observedLocationLng,
        }
      : null;

  const hadObservedLocation = Boolean(activity.observedLocationLabel?.trim());
  const observed = await backfillActivityObservedLocation(prisma, activityId);
  const locationNew = !hadObservedLocation && observed != null;
  const locationCorrected =
    observed != null &&
    priorCoords != null &&
    (Math.abs(priorCoords.latitude - observed.latitude) > 0.0005 ||
      Math.abs(priorCoords.longitude - observed.longitude) > 0.0005);

  if ((needsWeatherEnrichment(activity.weather) || locationCorrected || locationNew) && observed) {
    const window = activityWeatherWindow(activity.date, activity.duration);
    const trainingDayId = computeTrainingDayId(activity.date);
    const { predictions } = await fetchForecastPredictions({
      location: {
        latitude: observed.latitude,
        longitude: observed.longitude,
        label: observed.label,
      },
      windowStart: window.start,
      windowEnd: window.end,
      athleteId: 'default',
      trainingDayId,
    });

    const snapshot = extractActivityWeatherSnapshot(predictions, observed.label);
    const weatherLabel = snapshot ? serializeActivityWeather(snapshot) : null;

    if (weatherLabel) {
      await prisma.activity.update({
        where: { id: activityId },
        data: { weather: weatherLabel },
      });
      weatherUpdated = true;
    }
  }

  const shouldRefresh = shouldRefreshActivityNarrative({
    force: options?.forceNarrative,
    isToday,
    hasNarrative,
    weatherUpdated,
    locationNew,
  });

  if (shouldRefresh) {
    // Never clear narrative before success — a failed LLM would leave a forever-pending UI.
    narrativeRefreshed = await runActivityNarrativeAnalysis(activityId, {
      force:
        Boolean(options?.forceNarrative) ||
        (hasNarrative && isToday && (weatherUpdated || locationNew)),
    });
  }

  return { weatherUpdated, narrativeRefreshed };
}

/** Enrichit les activités outdoor du jour dont la météo est absente ou non affichable. */
export async function enrichTodayActivitiesContext(prisma: PrismaClient): Promise<void> {
  const today = startOfDay(new Date());
  const activities = await prisma.activity.findMany({
    where: {
      date: { gte: today, lt: addDays(today, 1) },
      type: { in: [...OUTDOOR_TYPES] },
    },
    select: { id: true, type: true, title: true, notes: true, weather: true },
  });

  await Promise.all(
    activities
      .filter((row) => !isIndoorActivitySession(row) && needsWeatherEnrichment(row.weather))
      .map(async ({ id }) => {
        try {
          await enrichActivityObservedContext(prisma, id);
        } catch (error) {
          console.error('[enrich-today-activities]', id, error);
        }
      }),
  );
}

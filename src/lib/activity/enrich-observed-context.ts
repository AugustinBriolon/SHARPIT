import { startOfDay, addDays } from 'date-fns';
import type { PrismaClient } from '@prisma/client';
import { Prisma, type ActivityType } from '@prisma/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { backfillActivityObservedLocation } from '@/lib/activity/observed-location';
import { activityWeatherWindow } from '@/lib/activity/activity-weather-window';
import {
  extractActivityWeatherSnapshot,
  needsWeatherEnrichment,
  serializeActivityWeather,
} from '@/lib/activity/activity-weather';
import { runActivityNarrativeAnalysis } from '@/lib/activity-narrative';
import { fetchForecastPredictions } from '@/lib/planned-session/forecast-fetch';
import { computeTrainingDayId } from '@/lib/training-day';

const OUTDOOR_TYPES = new Set<ActivityType>(['RUN', 'BIKE', 'SWIM', 'TRIATHLON']);

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
      date: true,
      duration: true,
      weather: true,
      narrativeAnalyzedAt: true,
      observedLocationLabel: true,
    },
  });

  if (!activity || !OUTDOOR_TYPES.has(activity.type)) {
    return { weatherUpdated, narrativeRefreshed };
  }

  const hadObservedLocation = Boolean(activity.observedLocationLabel?.trim());
  const observed = await backfillActivityObservedLocation(prisma, activityId);
  const locationNew = !hadObservedLocation && observed != null;

  if (needsWeatherEnrichment(activity.weather) && observed) {
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

  const today = isActivityToday(activity.date);
  const shouldRefreshNarrative =
    options?.forceNarrative ||
    weatherUpdated ||
    (locationNew && today) ||
    (today && !activity.narrativeAnalyzedAt);

  if (shouldRefreshNarrative) {
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        narrativeAnalysis: Prisma.DbNull,
        narrativeAnalyzedAt: null,
      },
    });
    narrativeRefreshed = await runActivityNarrativeAnalysis(activityId);
  }

  return { weatherUpdated, narrativeRefreshed };
}

export function isActivityToday(date: Date): boolean {
  const today = format(new Date(), 'yyyy-MM-dd', { locale: fr });
  return format(date, 'yyyy-MM-dd', { locale: fr }) === today;
}

/** Enrichit les activités outdoor du jour dont la météo est absente ou non affichable. */
export async function enrichTodayActivitiesContext(prisma: PrismaClient): Promise<void> {
  const today = startOfDay(new Date());
  const activities = await prisma.activity.findMany({
    where: {
      date: { gte: today, lt: addDays(today, 1) },
      type: { in: [...OUTDOOR_TYPES] },
    },
    select: { id: true, weather: true },
  });

  for (const { id, weather } of activities) {
    if (!needsWeatherEnrichment(weather)) continue;
    try {
      await enrichActivityObservedContext(prisma, id);
    } catch (error) {
      console.error('[enrich-today-activities]', id, error);
    }
  }
}

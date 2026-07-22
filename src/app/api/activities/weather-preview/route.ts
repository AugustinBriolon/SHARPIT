import { NextResponse } from 'next/server';
import { z } from 'zod';
import { activityWeatherWindow } from '@/lib/activity/activity-weather-window';
import {
  extractActivityWeatherSnapshot,
  formatActivityWeatherNarrative,
  serializeActivityWeather,
} from '@/lib/activity/activity-weather';
import { fetchForecastPredictions } from '@/lib/planned-session/forecast-fetch';
import { computeTrainingDayId } from '@/lib/training/training-day';

const schema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  label: z.string().optional().nullable(),
  date: z.coerce.date(),
  durationSec: z.coerce.number().int().positive().optional().nullable(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { latitude, longitude, label, date, durationSec } = parsed.data;
    const window = activityWeatherWindow(date, durationSec ?? null);
    const trainingDayId = computeTrainingDayId(date);
    const locationLabel = label?.trim() || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    const { predictions } = await fetchForecastPredictions({
      location: { latitude, longitude, label: locationLabel },
      windowStart: window.start,
      windowEnd: window.end,
      athleteId: 'default',
      trainingDayId,
    });

    const snapshot = extractActivityWeatherSnapshot(predictions, locationLabel);
    if (!snapshot) {
      return NextResponse.json({ weather: null, summary: null });
    }

    return NextResponse.json({
      weather: serializeActivityWeather(snapshot),
      summary: formatActivityWeatherNarrative(snapshot),
    });
  } catch (error) {
    console.error('[activities/weather-preview]', error);
    return NextResponse.json({ error: 'Impossible de récupérer la météo' }, { status: 500 });
  }
}

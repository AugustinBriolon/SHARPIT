/**
 * Fetch weather for an activity / planned-session window.
 *
 * Selection is driven by the session window (date + duration), not by when
 * sync happened: a run from yesterday enriched today always hits the archive.
 */

import { openMeteoEnvironmentalAdapter } from '@/core/adapters/environment/open-meteo-adapter';
import type { GeoLocation, EnvironmentalPrediction } from '@/core/environment';
import { createProviderSnapshot } from '@/core/environment/record';
import { aggregateFieldQuality, confidenceFromFieldQualities } from '@/core/environment/quality';
import { createOpenMeteoForecastProvider } from '@/infrastructure/environment/open-meteo-forecast-provider';
import { createOpenMeteoEnvironmentalProvider } from '@/infrastructure/environment/open-meteo-provider';

const FORECAST_PROVIDER = createOpenMeteoForecastProvider();
const ARCHIVE_PROVIDER = createOpenMeteoEnvironmentalProvider();

/** Prefer historical archive once the session ended more than 1h ago. */
export function shouldUseWeatherArchive(windowEnd: Date, now: Date = new Date()): boolean {
  return windowEnd.getTime() < now.getTime() - 60 * 60 * 1000;
}

export async function fetchForecastPredictions(input: {
  location: GeoLocation;
  windowStart: Date;
  windowEnd: Date;
  athleteId: string;
  trainingDayId: string;
}): Promise<{ predictions: EnvironmentalPrediction[]; providerId: string | null }> {
  const now = new Date();
  const useArchive = shouldUseWeatherArchive(input.windowEnd, now);
  const provider = useArchive ? ARCHIVE_PROVIDER : FORECAST_PROVIDER;

  const context = {
    location: input.location,
    from: input.windowStart,
    to: input.windowEnd,
  };

  if (!provider.isAvailable(context)) {
    return { predictions: [], providerId: null };
  }

  const result = await provider.fetch({
    athleteId: input.athleteId,
    location: input.location,
    from: input.windowStart,
    to: input.windowEnd,
    trainingDayId: input.trainingDayId,
  });

  if (result.status !== 'success') {
    return { predictions: [], providerId: provider.id };
  }

  const drafts = openMeteoEnvironmentalAdapter.adapt(result.payload, {
    athleteId: input.athleteId,
    receivedAt: result.fetchedAt,
    trainingDayId: input.trainingDayId,
    location: input.location,
    externalIdPrefix: useArchive ? 'open-meteo-archive' : 'open-meteo-forecast',
    providerSnapshot: createProviderSnapshot({
      providerId: provider.id,
      payload: result.payload,
      fetchedAt: result.fetchedAt,
    }),
  });

  const windowStartMs = input.windowStart.getTime();
  const windowEndMs = input.windowEnd.getTime();

  const predictions: EnvironmentalPrediction[] = drafts
    .filter((draft) => {
      const t = draft.observedAt.getTime();
      return t >= windowStartMs - 30 * 60 * 1000 && t <= windowEndMs + 30 * 60 * 1000;
    })
    .map((draft) => ({
      predictedAt: result.fetchedAt,
      targetAt: draft.observedAt,
      dimension: draft.dimension,
      payload: draft.payload,
      quality: aggregateFieldQuality(draft.fieldQuality),
      confidence: confidenceFromFieldQualities(draft.fieldQuality),
      providerId: provider.id,
    }));

  return { predictions, providerId: provider.id };
}

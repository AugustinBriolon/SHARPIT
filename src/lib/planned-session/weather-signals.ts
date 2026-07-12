import type { EnvironmentalPrediction } from '@/core/environment';
import type { PlannedSessionWeatherSignals } from '@/core/planned-session/types';
import { readWeatherMeasurements } from '@/lib/activity/activity-weather';

export function extractSessionWeatherSignals(
  predictions: EnvironmentalPrediction[],
): PlannedSessionWeatherSignals {
  let maxPrecipitationMm: number | null = null;
  let minTemperatureC: number | null = null;
  let maxWindMps: number | null = null;

  for (const prediction of predictions) {
    if (prediction.dimension !== 'WEATHER') continue;
    const payload = readWeatherMeasurements(prediction);
    if (!payload) continue;
    if (payload.precipitationMm != null) {
      maxPrecipitationMm = Math.max(maxPrecipitationMm ?? 0, payload.precipitationMm);
    }
    if (payload.airTemperatureC != null) {
      minTemperatureC =
        minTemperatureC == null
          ? payload.airTemperatureC
          : Math.min(minTemperatureC, payload.airTemperatureC);
    }
    if (payload.windSpeedMps != null) {
      maxWindMps = Math.max(maxWindMps ?? 0, payload.windSpeedMps);
    }
  }

  return { maxPrecipitationMm, minTemperatureC, maxWindMps };
}

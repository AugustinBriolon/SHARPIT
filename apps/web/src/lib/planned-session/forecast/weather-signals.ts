import type { EnvironmentalPrediction } from '@/core/environment';
import type { PlannedSessionWeatherSignals } from '@/core/planned-session/types';
import { readWeatherMeasurements } from '@/lib/activity/weather/activity-weather';

import { isSet } from '@/lib/util/value';

function mergeMinTemperature(acc: PlannedSessionWeatherSignals, airTemperatureC: number): number {
  return isSet(acc.minTemperatureC)
    ? Math.min(acc.minTemperatureC, airTemperatureC)
    : airTemperatureC;
}

function mergeWeatherPayload(
  acc: PlannedSessionWeatherSignals,
  payload: NonNullable<ReturnType<typeof readWeatherMeasurements>>,
): PlannedSessionWeatherSignals {
  const maxPrecipitationMm = isSet(payload.precipitationMm)
    ? Math.max(acc.maxPrecipitationMm ?? 0, payload.precipitationMm)
    : acc.maxPrecipitationMm;
  const minTemperatureC = isSet(payload.airTemperatureC)
    ? mergeMinTemperature(acc, payload.airTemperatureC)
    : acc.minTemperatureC;
  const maxWindMps = isSet(payload.windSpeedMps)
    ? Math.max(acc.maxWindMps ?? 0, payload.windSpeedMps)
    : acc.maxWindMps;
  return { maxPrecipitationMm, minTemperatureC, maxWindMps };
}

export function extractSessionWeatherSignals(
  predictions: EnvironmentalPrediction[],
): PlannedSessionWeatherSignals {
  let signals: PlannedSessionWeatherSignals = {
    maxPrecipitationMm: null,
    minTemperatureC: null,
    maxWindMps: null,
  };

  for (const prediction of predictions) {
    if (prediction.dimension !== 'WEATHER') {
      continue;
    }
    const payload = readWeatherMeasurements(prediction);
    if (!payload) {
      continue;
    }
    signals = mergeWeatherPayload(signals, payload);
  }

  return signals;
}

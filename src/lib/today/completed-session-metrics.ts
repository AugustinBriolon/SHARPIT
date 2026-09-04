import { ActivityType } from '@prisma/client';
import { isSet } from '@/lib/util/value';

export type CompletedSessionMetric = {
  label: string;
  value: string;
  unit: string;
};

/** Slim activity shape available on Today list selects. */
export type CompletedSessionMetricSource = {
  type: ActivityType;
  duration: number | null;
  load: number | null;
  rpe: number | null;
  runMetrics: { distanceM: number | null } | null;
  bikeMetrics: { tss: number | null; avgPower: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
  hikeMetrics: { distanceM: number | null; elevationM: number | null } | null;
  strengthSets: { exercise: string }[];
};

const MAX_METRICS = 3;

function pushMetric(
  metrics: CompletedSessionMetric[],
  metric: CompletedSessionMetric | null,
): void {
  if (metric && metrics.length < MAX_METRICS) {
    metrics.push(metric);
  }
}

function distanceMetric(meters: number | null | undefined): CompletedSessionMetric | null {
  if (!isSet(meters) || meters <= 0) {
    return null;
  }
  if (meters >= 1000) {
    return { label: 'Distance', value: (meters / 1000).toFixed(2), unit: 'km' };
  }
  return { label: 'Distance', value: String(Math.round(meters)), unit: 'm' };
}

function durationMetric(seconds: number | null | undefined): CompletedSessionMetric | null {
  if (!isSet(seconds) || seconds <= 0) {
    return null;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return {
      label: 'Durée',
      value: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
      unit: 'h',
    };
  }
  return {
    label: 'Durée',
    value: `${m}:${s.toString().padStart(2, '0')}`,
    unit: 'min',
  };
}

function runPaceMetric(
  durationSec: number | null | undefined,
  distanceM: number | null | undefined,
): CompletedSessionMetric | null {
  if (!isSet(durationSec) || !isSet(distanceM) || durationSec <= 0 || distanceM <= 0) {
    return null;
  }
  const paceSecPerKm = durationSec / (distanceM / 1000);
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return {
    label: 'Allure',
    value: `${m}:${s.toString().padStart(2, '0')}`,
    unit: '/km',
  };
}

function swimPaceMetric(
  durationSec: number | null | undefined,
  distanceM: number | null | undefined,
): CompletedSessionMetric | null {
  if (!isSet(durationSec) || !isSet(distanceM) || durationSec <= 0 || distanceM <= 0) {
    return null;
  }
  const paceSecPer100m = durationSec / (distanceM / 100);
  const m = Math.floor(paceSecPer100m / 60);
  const s = Math.round(paceSecPer100m % 60);
  return {
    label: 'Allure',
    value: `${m}:${s.toString().padStart(2, '0')}`,
    unit: '/100m',
  };
}

function elevationMetric(meters: number | null | undefined): CompletedSessionMetric | null {
  if (!isSet(meters) || meters <= 0) {
    return null;
  }
  return { label: 'D+', value: String(Math.round(meters)), unit: 'm' };
}

function powerMetric(watts: number | null | undefined): CompletedSessionMetric | null {
  if (!isSet(watts) || watts <= 0) {
    return null;
  }
  return { label: 'Puissance', value: String(Math.round(watts)), unit: 'W' };
}

function tssMetric(tss: number | null | undefined): CompletedSessionMetric | null {
  if (!isSet(tss) || tss <= 0) {
    return null;
  }
  return { label: 'Charge', value: String(Math.round(tss)), unit: 'TSS' };
}

function loadMetric(load: number | null | undefined): CompletedSessionMetric | null {
  if (!isSet(load) || load <= 0) {
    return null;
  }
  return { label: 'Charge', value: String(Math.round(load)), unit: 'TSS' };
}

function rpeMetric(rpe: number | null | undefined): CompletedSessionMetric | null {
  if (!isSet(rpe) || rpe <= 0) {
    return null;
  }
  return { label: 'RPE', value: String(rpe), unit: '' };
}

function strengthExerciseMetric(sets: { exercise: string }[]): CompletedSessionMetric | null {
  if (!sets.length) {
    return null;
  }
  const unique = new Set(sets.map((s) => s.exercise.trim()).filter(Boolean));
  const count = unique.size > 0 ? unique.size : sets.length;
  return {
    label: 'Exercices',
    value: String(count),
    unit: count === 1 ? 'exo' : 'exos',
  };
}

function buildRunMetrics(activity: CompletedSessionMetricSource): CompletedSessionMetric[] {
  const metrics: CompletedSessionMetric[] = [];
  pushMetric(metrics, distanceMetric(activity.runMetrics?.distanceM));
  pushMetric(metrics, durationMetric(activity.duration));
  pushMetric(metrics, runPaceMetric(activity.duration, activity.runMetrics?.distanceM));
  pushMetric(metrics, loadMetric(activity.load));
  return metrics;
}

function buildBikeMetrics(activity: CompletedSessionMetricSource): CompletedSessionMetric[] {
  const metrics: CompletedSessionMetric[] = [];
  pushMetric(metrics, durationMetric(activity.duration));
  pushMetric(metrics, powerMetric(activity.bikeMetrics?.avgPower));
  pushMetric(metrics, tssMetric(activity.bikeMetrics?.tss) ?? loadMetric(activity.load));
  pushMetric(metrics, rpeMetric(activity.rpe));
  return metrics;
}

function buildSwimMetrics(activity: CompletedSessionMetricSource): CompletedSessionMetric[] {
  const metrics: CompletedSessionMetric[] = [];
  pushMetric(metrics, distanceMetric(activity.swimMetrics?.distanceM));
  pushMetric(metrics, durationMetric(activity.duration));
  pushMetric(metrics, swimPaceMetric(activity.duration, activity.swimMetrics?.distanceM));
  pushMetric(metrics, loadMetric(activity.load));
  return metrics;
}

function buildHikeMetrics(activity: CompletedSessionMetricSource): CompletedSessionMetric[] {
  const metrics: CompletedSessionMetric[] = [];
  pushMetric(metrics, distanceMetric(activity.hikeMetrics?.distanceM));
  pushMetric(metrics, durationMetric(activity.duration));
  const pace = runPaceMetric(activity.duration, activity.hikeMetrics?.distanceM);
  pushMetric(metrics, pace);
  pushMetric(metrics, elevationMetric(activity.hikeMetrics?.elevationM));
  return metrics;
}

function buildStrengthMetrics(activity: CompletedSessionMetricSource): CompletedSessionMetric[] {
  const metrics: CompletedSessionMetric[] = [];
  pushMetric(metrics, durationMetric(activity.duration));
  pushMetric(metrics, rpeMetric(activity.rpe));
  pushMetric(metrics, loadMetric(activity.load));
  pushMetric(metrics, strengthExerciseMetric(activity.strengthSets));
  return metrics;
}

function buildGenericMetrics(activity: CompletedSessionMetricSource): CompletedSessionMetric[] {
  const metrics: CompletedSessionMetric[] = [];
  pushMetric(metrics, durationMetric(activity.duration));
  pushMetric(metrics, loadMetric(activity.load));
  pushMetric(metrics, rpeMetric(activity.rpe));
  return metrics;
}

/**
 * Up to three key reading metrics for a completed Today session preview.
 * Value and unit are split for the instrument KPI layout.
 */
export function buildCompletedSessionMetrics(
  activity: CompletedSessionMetricSource,
): CompletedSessionMetric[] {
  switch (activity.type) {
    case ActivityType.RUN:
      return buildRunMetrics(activity);
    case ActivityType.BIKE:
      return buildBikeMetrics(activity);
    case ActivityType.SWIM:
      return buildSwimMetrics(activity);
    case ActivityType.HIKE:
      return buildHikeMetrics(activity);
    case ActivityType.STRENGTH:
      return buildStrengthMetrics(activity);
    default:
      return buildGenericMetrics(activity);
  }
}

import type { ActivityDetail, ActivitySpec } from '@/components/training/activity/detail/types';
import { ActivityType } from '@prisma/client';

type MetricAudience = ActivitySpec['audience'];

function pushSpec(
  specs: ActivitySpec[],
  label: string,
  value: string | number | null | undefined,
  audience: MetricAudience = 'core',
) {
  if (value === null || value === undefined || value === '') {
    return;
  }
  specs.push({ label, value, audience });
}

export function buildRunActivitySpecs(activity: ActivityDetail): ActivitySpec[] {
  const specs: ActivitySpec[] = [];
  if (activity.type !== ActivityType.RUN || !activity.runMetrics) {
    return specs;
  }
  const m = activity.runMetrics;
  pushSpec(specs, 'Dénivelé', m.elevationM !== null ? `${m.elevationM} m` : null);
  pushSpec(specs, 'Puissance moy.', m.avgPower !== null ? `${Math.round(m.avgPower)} W` : null);
  pushSpec(specs, 'Chaussures', m.shoes);
  return specs;
}

export function buildBikeActivitySpecs(activity: ActivityDetail): ActivitySpec[] {
  const specs: ActivitySpec[] = [];
  if (activity.type !== ActivityType.BIKE || !activity.bikeMetrics) {
    return specs;
  }
  const m = activity.bikeMetrics;
  pushSpec(specs, 'FTP %', m.ftpPercent, 'expert');
  pushSpec(
    specs,
    'NP',
    m.normalizedPower !== null ? `${Math.round(m.normalizedPower)} W` : null,
    'expert',
  );
  pushSpec(specs, 'IF', m.intensityFactor !== null ? m.intensityFactor.toFixed(2) : null, 'expert');
  pushSpec(specs, 'TSS', m.tss !== null ? Math.round(m.tss) : null, 'expert');
  pushSpec(specs, 'Cadence', m.avgCadence !== null ? `${m.avgCadence} rpm` : null);
  pushSpec(specs, 'Calories', m.calories);
  pushSpec(specs, 'Vélo', m.bikeName);
  return specs;
}

export function buildHikeActivitySpecs(activity: ActivityDetail): ActivitySpec[] {
  const specs: ActivitySpec[] = [];
  if (activity.type !== ActivityType.HIKE || !activity.hikeMetrics) {
    return specs;
  }
  const m = activity.hikeMetrics;
  pushSpec(specs, 'D−', m.elevationLossM !== null ? `${Math.round(m.elevationLossM)} m` : null);
  pushSpec(
    specs,
    'Vitesse moy.',
    m.avgSpeedMps !== null ? `${(m.avgSpeedMps * 3.6).toFixed(1)} km/h` : null,
  );
  pushSpec(specs, 'Calories', m.calories);
  return specs;
}

export function buildSwimActivitySpecs(activity: ActivityDetail): ActivitySpec[] {
  const specs: ActivitySpec[] = [];
  if (activity.type !== ActivityType.SWIM || !activity.swimMetrics) {
    return specs;
  }
  const m = activity.swimMetrics;
  pushSpec(specs, 'Séries', m.sets);
  pushSpec(
    specs,
    'CSS',
    m.cssSecPer100m !== null
      ? `${Math.floor(m.cssSecPer100m / 60)}:${String(Math.round(m.cssSecPer100m % 60)).padStart(2, '0')}/100m`
      : null,
    'expert',
  );
  pushSpec(specs, 'SWOLF', m.swolf);
  pushSpec(specs, 'Drills', m.drills);
  return specs;
}

export function buildActivitySpecs(activity: ActivityDetail): ActivitySpec[] {
  return [
    ...buildRunActivitySpecs(activity),
    ...buildBikeActivitySpecs(activity),
    ...buildHikeActivitySpecs(activity),
    ...buildSwimActivitySpecs(activity),
  ];
}

import { ActivityType } from '@prisma/client';
import {
  CHART_BASE_STROKE,
  CHART_RECOVERY_STROKE,
  CHART_RISK_STROKE,
  CHART_TEMPO_STROKE,
  CHART_THRESHOLD_STROKE,
  CHART_VO2_STROKE,
} from '@/lib/theme/chart-theme';
import { formatAltitudeMeters } from '@/lib/streams/stream-chart-data';

export type StreamMetricOption = {
  key: 'alt' | 'hr' | 'watts' | 'cadence' | 'speed' | 'pace';
  label: string;
  shortLabel: string;
  color: string;
  unit: string;
  formatter?: (v: number) => string;
  reversed?: boolean;
};

function paceFmt(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, '0')}`;
}

function pushSpeedMetric(
  metrics: StreamMetricOption[],
  hasSpeed: boolean,
  type: ActivityType,
): void {
  if (!hasSpeed) {
    return;
  }
  if (type === ActivityType.RUN) {
    metrics.push({
      key: 'pace',
      label: 'Allure',
      shortLabel: 'Allure',
      color: CHART_VO2_STROKE,
      unit: '/km',
      formatter: paceFmt,
      reversed: true,
    });
    return;
  }
  metrics.push({
    key: 'speed',
    label: 'Vitesse',
    shortLabel: 'Vitesse',
    color: CHART_BASE_STROKE,
    unit: 'km/h',
  });
}

export function buildStreamMetricOptions(
  has: {
    altitude: boolean;
    hr: boolean;
    watts: boolean;
    cadence: boolean;
    speed: boolean;
  },
  type: ActivityType,
): StreamMetricOption[] {
  const metrics: StreamMetricOption[] = [];

  if (has.hr) {
    metrics.push({
      key: 'hr',
      label: 'Fréquence cardiaque',
      shortLabel: 'FC',
      color: CHART_RISK_STROKE,
      unit: 'bpm',
    });
  }
  if (has.watts) {
    metrics.push({
      key: 'watts',
      label: 'Puissance',
      shortLabel: 'Puissance',
      color: CHART_THRESHOLD_STROKE,
      unit: 'W',
    });
  }

  pushSpeedMetric(metrics, has.speed, type);

  if (has.altitude) {
    metrics.push({
      key: 'alt',
      label: 'Dénivelé',
      shortLabel: 'Dénivelé',
      color: CHART_RECOVERY_STROKE,
      unit: 'm',
      formatter: formatAltitudeMeters,
    });
  }
  if (has.cadence) {
    metrics.push({
      key: 'cadence',
      label: 'Cadence',
      shortLabel: 'Cadence',
      color: CHART_TEMPO_STROKE,
      unit: type === ActivityType.RUN ? 'spm' : 'rpm',
    });
  }

  return metrics;
}

export type StreamMetricKey = StreamMetricOption['key'];

/** Toggle metric chips — at most `max` active; adding a third drops the oldest selection. */
export function nextSelectedStreamMetricKeys(
  current: StreamMetricKey[],
  key: StreamMetricKey,
  max = 2,
): StreamMetricKey[] {
  if (current.includes(key)) {
    if (current.length === 1) {
      return current;
    }
    return current.filter((entry) => entry !== key);
  }
  if (current.length < max) {
    return [...current, key];
  }
  return [current[1]!, key];
}

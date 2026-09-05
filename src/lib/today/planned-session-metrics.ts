import type { ActivityType, SessionIntensity } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import { intensityLabels } from '@/lib/planned-session/sessions';
import type { SessionPreviewMetric } from '@/components/ui/instruments/session-preview-parts';

const MAX_METRICS = 3;

function pushMetric(metrics: SessionPreviewMetric[], metric: SessionPreviewMetric | null): void {
  if (metric && metrics.length < MAX_METRICS) {
    metrics.push(metric);
  }
}

function plannedDurationMetric(minutes: number | null | undefined): SessionPreviewMetric | null {
  if (!isSet(minutes) || minutes <= 0) {
    return null;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return {
      label: 'Durée',
      value: `${h}:${m.toString().padStart(2, '0')}`,
      unit: 'h',
    };
  }
  return { label: 'Durée', value: String(m), unit: 'min' };
}

function intensityMetric(
  intensity: SessionIntensity | null | undefined,
): SessionPreviewMetric | null {
  if (!intensity) {
    return null;
  }
  return { label: 'Intensité', value: intensityLabels[intensity], unit: '' };
}

function loadMetric(load: number | null | undefined): SessionPreviewMetric | null {
  if (!isSet(load) || load <= 0) {
    return null;
  }
  return { label: 'Charge', value: String(Math.round(load)), unit: 'TSS' };
}

function goalMetric(goalTitle: string | null | undefined): SessionPreviewMetric | null {
  const title = goalTitle?.trim();
  if (!title) {
    return null;
  }
  return { label: 'Objectif', value: title, unit: '' };
}

export type PlannedSessionMetricSource = {
  type: ActivityType;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  load: number | null;
  goalTitle?: string | null;
};

/** Up to three planned-session KPIs for Today preview cards. */
export function buildPlannedSessionMetrics(
  session: PlannedSessionMetricSource,
): SessionPreviewMetric[] {
  const metrics: SessionPreviewMetric[] = [];
  pushMetric(metrics, intensityMetric(session.intensity));
  pushMetric(metrics, plannedDurationMetric(session.durationMin));
  pushMetric(metrics, loadMetric(session.load));
  pushMetric(metrics, goalMetric(session.goalTitle));
  return metrics;
}

export type BrickSessionMetricSource = {
  legs: Array<{
    durationMin: number | null;
    load?: number | null;
  }>;
  goalTitle?: string | null;
};

/** Aggregate brick KPIs: total duration, leg count, load or goal. */
export function buildBrickSessionMetrics(source: BrickSessionMetricSource): SessionPreviewMetric[] {
  const metrics: SessionPreviewMetric[] = [];
  const totalMin = source.legs.reduce((sum, leg) => sum + (leg.durationMin ?? 0), 0);
  pushMetric(metrics, plannedDurationMetric(totalMin > 0 ? totalMin : null));
  pushMetric(metrics, {
    label: 'Jambes',
    value: String(source.legs.length),
    unit: source.legs.length === 1 ? 'sport' : 'sports',
  });
  const totalLoad = source.legs.reduce((sum, leg) => sum + (leg.load ?? 0), 0);
  pushMetric(metrics, loadMetric(totalLoad > 0 ? totalLoad : null));
  pushMetric(metrics, goalMetric(source.goalTitle));
  return metrics;
}

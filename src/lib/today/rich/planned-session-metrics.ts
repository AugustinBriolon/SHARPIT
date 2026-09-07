import type { ActivityType, SessionIntensity } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import { resolveSessionAccessories } from '@/lib/planned-session/accessories/session-accessories';
import { intensityLabels } from '@/lib/planned-session/sessions';
import { parseStrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';
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

function uniqueStrengthExerciseCount(prescription: unknown): number | null {
  const parsed = parseStrengthPrescription(prescription);
  if (!parsed) {
    return null;
  }
  const names = new Set(
    parsed.sets.map((set) => set.exercise.trim().toLowerCase()).filter(Boolean),
  );
  return names.size > 0 ? names.size : null;
}

function strengthExerciseMetric(prescription: unknown): SessionPreviewMetric | null {
  const count = uniqueStrengthExerciseCount(prescription);
  if (!count) {
    return null;
  }
  return {
    label: 'Exercices',
    value: String(count),
    unit: count === 1 ? 'exo' : 'exos',
  };
}

function compactEquipmentLabel(label: string): string {
  const head = label.split(/[+/]/)[0]?.trim();
  return head || label;
}

function equipmentTagKey(label: string): string {
  const compact = compactEquipmentLabel(label).toLowerCase();
  if (compact.startsWith('élastiques') || compact.startsWith('elastiques')) {
    return 'élastiques';
  }
  return compact;
}

function equipmentTagDisplay(label: string): string {
  const compact = compactEquipmentLabel(label);
  if (equipmentTagKey(compact) === 'élastiques') {
    return 'Élastiques';
  }
  return compact;
}

const MAX_EQUIPMENT_TAGS = 3;
const EQUIPMENT_TAG_NAMES = 2;

export function buildPlannedSessionEquipmentTags(
  session: Pick<
    PlannedSessionMetricSource,
    'type' | 'title' | 'description' | 'accessories' | 'strengthPrescription'
  >,
): string[] {
  const accessories = resolveSessionAccessories({
    type: session.type,
    title: session.title,
    description: session.description,
    accessories: session.accessories,
    strengthPrescription: session.strengthPrescription,
  });
  if (accessories.length === 0) {
    return [];
  }
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const item of accessories) {
    const key = equipmentTagKey(item.label);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    labels.push(equipmentTagDisplay(item.label));
  }
  if (labels.length <= MAX_EQUIPMENT_TAGS) {
    return labels;
  }
  return [...labels.slice(0, EQUIPMENT_TAG_NAMES), `+${labels.length - EQUIPMENT_TAG_NAMES}`];
}

export type PlannedSessionMetricSource = {
  type: ActivityType;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  load: number | null;
  goalTitle?: string | null;
  title?: string | null;
  description?: string | null;
  accessories?: unknown;
  strengthPrescription?: unknown;
};

function buildEndurancePlannedMetrics(session: PlannedSessionMetricSource): SessionPreviewMetric[] {
  const metrics: SessionPreviewMetric[] = [];
  pushMetric(metrics, intensityMetric(session.intensity));
  pushMetric(metrics, plannedDurationMetric(session.durationMin));
  pushMetric(metrics, loadMetric(session.load));
  pushMetric(metrics, goalMetric(session.goalTitle));
  return metrics;
}

function buildStrengthPlannedMetrics(session: PlannedSessionMetricSource): SessionPreviewMetric[] {
  const metrics: SessionPreviewMetric[] = [];
  pushMetric(metrics, plannedDurationMetric(session.durationMin));
  pushMetric(metrics, strengthExerciseMetric(session.strengthPrescription));
  if (metrics.length < 2) {
    pushMetric(metrics, intensityMetric(session.intensity));
  }
  pushMetric(metrics, loadMetric(session.load));
  pushMetric(metrics, goalMetric(session.goalTitle));
  return metrics;
}

/** Up to three planned-session KPIs for Today and Plan preview cards. */
export function buildPlannedSessionMetrics(
  session: PlannedSessionMetricSource,
): SessionPreviewMetric[] {
  if (session.type === 'STRENGTH') {
    return buildStrengthPlannedMetrics(session);
  }
  return buildEndurancePlannedMetrics(session);
}

export function buildPlannedSessionPreview(session: PlannedSessionMetricSource): {
  metrics: SessionPreviewMetric[];
  equipment: string[];
} {
  return {
    metrics: buildPlannedSessionMetrics(session),
    equipment: buildPlannedSessionEquipmentTags(session),
  };
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

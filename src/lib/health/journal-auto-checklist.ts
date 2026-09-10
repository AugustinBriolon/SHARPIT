/**
 * Derived journal auto-checklist — presentation only (no Core / no persistence).
 */

import type { JournalThresholds } from '@/lib/health/journal-prefs';
import { JOURNAL_AUTO_ITEM_LABELS, type JournalAutoItemId } from '@/lib/health/journal-auto-ids';

export type { JournalAutoItemId };

export type JournalAutoChecklistStatus = 'done' | 'missed' | 'unavailable';

export type JournalAutoChecklistItem = {
  id: JournalAutoItemId;
  label: string;
  status: JournalAutoChecklistStatus;
  detail: string | null;
};

export type JournalAutoHealthInput = {
  totalSteps: number | null;
  stress: number | null;
  napMinutes: number | null;
  sleepMinutes: number | null;
  bodyBattery: number | null;
  /** From DailyNutrition.water when synced (ml). */
  waterMl: number | null;
};

export type JournalAutoActivityInput = {
  type: string;
  /** Duration in seconds. */
  duration: number | null;
};

const CARDIO_TYPES = new Set(['RUN', 'BIKE', 'SWIM', 'TRIATHLON', 'HIKE']);

export function sumCardioMinutes(activities: readonly JournalAutoActivityInput[]): number {
  let seconds = 0;
  for (const activity of activities) {
    if (
      !CARDIO_TYPES.has(activity.type) ||
      activity.duration === null ||
      activity.duration === undefined ||
      activity.duration <= 0
    ) {
      continue;
    }
    seconds += activity.duration;
  }
  return seconds / 60;
}

export function sumStrengthMinutes(activities: readonly JournalAutoActivityInput[]): number {
  let seconds = 0;
  for (const activity of activities) {
    if (
      activity.type !== 'STRENGTH' ||
      activity.duration === null ||
      activity.duration === undefined ||
      activity.duration <= 0
    ) {
      continue;
    }
    seconds += activity.duration;
  }
  return seconds / 60;
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${rounded} min`;
}

function unavailable(id: JournalAutoItemId): JournalAutoChecklistItem {
  return {
    id,
    label: JOURNAL_AUTO_ITEM_LABELS[id],
    status: 'unavailable',
    detail: 'Données absentes',
  };
}

function buildMinThresholdItem(
  id: JournalAutoItemId,
  value: number | null | undefined,
  threshold: number,
  formatDetail: (value: number, threshold: number) => string,
): JournalAutoChecklistItem {
  if (value === null || value === undefined) {
    return unavailable(id);
  }
  const done = value >= threshold;
  return {
    id,
    label: JOURNAL_AUTO_ITEM_LABELS[id],
    status: done ? 'done' : 'missed',
    detail: formatDetail(value, threshold),
  };
}

function buildMaxThresholdItem(
  id: JournalAutoItemId,
  value: number | null | undefined,
  threshold: number,
  formatDetail: (value: number, threshold: number) => string,
): JournalAutoChecklistItem {
  if (value === null || value === undefined) {
    return unavailable(id);
  }
  const done = value <= threshold;
  return {
    id,
    label: JOURNAL_AUTO_ITEM_LABELS[id],
    status: done ? 'done' : 'missed',
    detail: formatDetail(value, threshold),
  };
}

function buildActivityMinItem(
  id: JournalAutoItemId,
  minutes: number,
  threshold: number,
): JournalAutoChecklistItem {
  const done = minutes >= threshold;
  return {
    id,
    label: JOURNAL_AUTO_ITEM_LABELS[id],
    status: done ? 'done' : 'missed',
    detail: `${formatMinutes(minutes)} / ≥ ${threshold} min`,
  };
}

function buildStepsItem(
  health: JournalAutoHealthInput | null,
  thresholds: JournalThresholds,
): JournalAutoChecklistItem {
  return buildMinThresholdItem(
    'steps_10k',
    health?.totalSteps,
    thresholds.steps,
    (value, threshold) => `${value.toLocaleString('fr-FR')} / ${threshold.toLocaleString('fr-FR')}`,
  );
}

function buildStressItem(
  health: JournalAutoHealthInput | null,
  thresholds: JournalThresholds,
): JournalAutoChecklistItem {
  return buildMaxThresholdItem(
    'stress_ok',
    health?.stress,
    thresholds.stressMax,
    (value, threshold) => `${value} / ≤ ${threshold}`,
  );
}

function buildNapItem(health: JournalAutoHealthInput | null): JournalAutoChecklistItem {
  const nap = health?.napMinutes ?? null;
  if (nap === null || nap === undefined) {
    return unavailable('nap');
  }
  const done = nap > 0;
  return {
    id: 'nap',
    label: JOURNAL_AUTO_ITEM_LABELS.nap,
    status: done ? 'done' : 'missed',
    detail: done ? formatMinutes(nap) : 'Aucune sieste',
  };
}

function buildSleepItem(
  health: JournalAutoHealthInput | null,
  thresholds: JournalThresholds,
): JournalAutoChecklistItem {
  return buildMinThresholdItem(
    'sleep_target',
    health?.sleepMinutes,
    thresholds.sleepMinMinutes,
    (value, threshold) => `${formatMinutes(value)} / ≥ ${threshold} min`,
  );
}

function buildBodyBatteryItem(
  health: JournalAutoHealthInput | null,
  thresholds: JournalThresholds,
): JournalAutoChecklistItem {
  return buildMinThresholdItem(
    'body_battery_ok',
    health?.bodyBattery,
    thresholds.bodyBatteryMin,
    (value, threshold) => `${value} / ≥ ${threshold}`,
  );
}

function buildHydrationItem(
  health: JournalAutoHealthInput | null,
  thresholds: JournalThresholds,
): JournalAutoChecklistItem {
  return buildMinThresholdItem(
    'hydration_sync',
    health?.waterMl,
    thresholds.hydrationMlMin,
    (value, threshold) =>
      `${value.toLocaleString('fr-FR')} ml / ≥ ${threshold.toLocaleString('fr-FR')} ml`,
  );
}

function createAutoChecklistBuilders(
  health: JournalAutoHealthInput | null,
  cardioMin: number,
  strengthMin: number,
  thresholds: JournalThresholds,
): Record<JournalAutoItemId, () => JournalAutoChecklistItem> {
  return {
    steps_10k: () => buildStepsItem(health, thresholds),
    stress_ok: () => buildStressItem(health, thresholds),
    nap: () => buildNapItem(health),
    cardio_20: () => buildActivityMinItem('cardio_20', cardioMin, thresholds.cardioMinMinutes),
    strength_20: () =>
      buildActivityMinItem('strength_20', strengthMin, thresholds.strengthMinMinutes),
    sleep_target: () => buildSleepItem(health, thresholds),
    body_battery_ok: () => buildBodyBatteryItem(health, thresholds),
    hydration_sync: () => buildHydrationItem(health, thresholds),
    outdoor_minutes: () => unavailable('outdoor_minutes'),
  };
}

export function buildJournalAutoChecklist(input: {
  health: JournalAutoHealthInput | null;
  activities: readonly JournalAutoActivityInput[];
  thresholds: JournalThresholds;
  enabledIds: readonly JournalAutoItemId[];
}): JournalAutoChecklistItem[] {
  const { health, activities, thresholds, enabledIds } = input;
  const cardioMin = sumCardioMinutes(activities);
  const strengthMin = sumStrengthMinutes(activities);
  const builders = createAutoChecklistBuilders(health, cardioMin, strengthMin, thresholds);
  return enabledIds.map((id) => builders[id]());
}

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

export function buildJournalAutoChecklist(input: {
  health: JournalAutoHealthInput | null;
  activities: readonly JournalAutoActivityInput[];
  thresholds: JournalThresholds;
  enabledIds: readonly JournalAutoItemId[];
}): JournalAutoChecklistItem[] {
  const { health, activities, thresholds, enabledIds } = input;
  const cardioMin = sumCardioMinutes(activities);
  const strengthMin = sumStrengthMinutes(activities);

  const builders: Record<JournalAutoItemId, () => JournalAutoChecklistItem> = {
    steps_10k: () => {
      const steps = health?.totalSteps ?? null;
      if (steps === null || steps === undefined) {
        return unavailable('steps_10k');
      }
      const done = steps >= thresholds.steps;
      return {
        id: 'steps_10k',
        label: JOURNAL_AUTO_ITEM_LABELS.steps_10k,
        status: done ? 'done' : 'missed',
        detail: `${steps.toLocaleString('fr-FR')} / ${thresholds.steps.toLocaleString('fr-FR')}`,
      };
    },
    stress_ok: () => {
      const stress = health?.stress ?? null;
      if (stress === null || stress === undefined) {
        return unavailable('stress_ok');
      }
      const done = stress <= thresholds.stressMax;
      return {
        id: 'stress_ok',
        label: JOURNAL_AUTO_ITEM_LABELS.stress_ok,
        status: done ? 'done' : 'missed',
        detail: `${stress} / ≤ ${thresholds.stressMax}`,
      };
    },
    nap: () => {
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
    },
    sun: () => unavailable('sun'),
    cardio_20: () => {
      const done = cardioMin >= thresholds.cardioMinMinutes;
      return {
        id: 'cardio_20',
        label: JOURNAL_AUTO_ITEM_LABELS.cardio_20,
        status: done ? 'done' : 'missed',
        detail: `${formatMinutes(cardioMin)} / ≥ ${thresholds.cardioMinMinutes} min`,
      };
    },
    strength_20: () => {
      const done = strengthMin >= thresholds.strengthMinMinutes;
      return {
        id: 'strength_20',
        label: JOURNAL_AUTO_ITEM_LABELS.strength_20,
        status: done ? 'done' : 'missed',
        detail: `${formatMinutes(strengthMin)} / ≥ ${thresholds.strengthMinMinutes} min`,
      };
    },
    sleep_target: () => {
      const sleep = health?.sleepMinutes ?? null;
      if (sleep === null || sleep === undefined) {
        return unavailable('sleep_target');
      }
      const done = sleep >= thresholds.sleepMinMinutes;
      return {
        id: 'sleep_target',
        label: JOURNAL_AUTO_ITEM_LABELS.sleep_target,
        status: done ? 'done' : 'missed',
        detail: `${formatMinutes(sleep)} / ≥ ${thresholds.sleepMinMinutes} min`,
      };
    },
    body_battery_ok: () => {
      const battery = health?.bodyBattery ?? null;
      if (battery === null || battery === undefined) {
        return unavailable('body_battery_ok');
      }
      const done = battery >= thresholds.bodyBatteryMin;
      return {
        id: 'body_battery_ok',
        label: JOURNAL_AUTO_ITEM_LABELS.body_battery_ok,
        status: done ? 'done' : 'missed',
        detail: `${battery} / ≥ ${thresholds.bodyBatteryMin}`,
      };
    },
    hydration_sync: () => {
      const water = health?.waterMl ?? null;
      if (water === null || water === undefined) {
        return unavailable('hydration_sync');
      }
      const done = water >= thresholds.hydrationMlMin;
      return {
        id: 'hydration_sync',
        label: JOURNAL_AUTO_ITEM_LABELS.hydration_sync,
        status: done ? 'done' : 'missed',
        detail: `${water.toLocaleString('fr-FR')} ml / ≥ ${thresholds.hydrationMlMin.toLocaleString('fr-FR')} ml`,
      };
    },
    outdoor_minutes: () => unavailable('outdoor_minutes'),
  };

  return enabledIds.map((id) => builders[id]());
}

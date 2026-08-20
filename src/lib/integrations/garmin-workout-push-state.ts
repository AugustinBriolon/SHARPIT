/**
 * Helpers for Garmin workout push dedupe, calendar status and staleness.
 * Sport-agnostic and pure where possible — network checks live in the
 * per-sport push modules.
 */
import { Prisma } from '@prisma/client';
import type {
  EndurancePrescription,
  EnduranceStep,
} from '@/lib/planned-session/endurance-prescription';
import type { AthleteThresholds } from '@/lib/planned-session/endurance-targets';

export type GarminPushReceipt = {
  workoutId: string;
  scheduledDate: string | null;
  pushedAt: string; // ISO
};

export type GarminPushBlockReason = {
  code: 'ALREADY_PUSHED';
  message: string;
  receipt: GarminPushReceipt;
  /** Workout still found in Connect library (best-effort). */
  workoutExists: boolean | null;
  /** Workout id found on Connect calendar for scheduled date (best-effort). */
  calendarActive: boolean | null;
};

export function buildAlreadyPushedError(input: {
  receipt: GarminPushReceipt;
  workoutExists: boolean | null;
  calendarActive: boolean | null;
}): GarminPushBlockReason {
  const when = input.receipt.scheduledDate
    ? `calendrier ${input.receipt.scheduledDate}`
    : 'Connect';
  return {
    code: 'ALREADY_PUSHED',
    message: `Séance déjà envoyée à Garmin (${when}). Utilise « Renvoyer » pour remplacer.`,
    receipt: input.receipt,
    workoutExists: input.workoutExists,
    calendarActive: input.calendarActive,
  };
}

export function isGarminPushBlockReason(value: unknown): value is GarminPushBlockReason {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.code === 'ALREADY_PUSHED' && typeof record.message === 'string';
}

/** Clear push receipt when prescription/date no longer match what was sent. */
export function garminPushClearOnSessionChange(patch: {
  strengthPrescription?: unknown;
  endurancePrescription?: unknown;
  date?: unknown;
}): {
  garminWorkoutId: null;
  garminWorkoutScheduledDate: null;
  garminWorkoutPushedAt: null;
  /** Json column — Prisma needs DbNull, not null, to write SQL NULL. */
  garminWorkoutThresholds: typeof Prisma.DbNull;
} | null {
  const touched =
    'strengthPrescription' in patch || 'endurancePrescription' in patch || 'date' in patch;
  if (!touched) return null;
  return {
    garminWorkoutId: null,
    garminWorkoutScheduledDate: null,
    garminWorkoutPushedAt: null,
    garminWorkoutThresholds: Prisma.DbNull,
  };
}

/** Athlete references a prescription actually depends on, override-aware. */
export function thresholdKeysUsedBy(
  prescription: EndurancePrescription,
): Array<keyof AthleteThresholds> {
  const keys = new Set<keyof AthleteThresholds>();

  const visit = (step: EnduranceStep): void => {
    const { target } = step;
    // An absolute override does not move when thresholds do.
    if (target.absEasy != null && target.absHard != null) return;
    if (target.metric === 'pace') keys.add('runThresholdPaceSecPerKm');
    else if (target.metric === 'power') keys.add('ftpW');
    else if (target.metric === 'hr') {
      const ref = target.hrRef ?? 'auto';
      if (ref === 'maxhr') keys.add('maxHr');
      else if (ref === 'lthr') keys.add('lthr');
      else {
        keys.add('lthr');
        keys.add('maxHr');
      }
    }
  };

  for (const block of prescription.blocks) {
    if (block.kind === 'step') visit(block.step);
    else block.steps.forEach(visit);
  }
  return [...keys];
}

export type GarminThresholdChange = {
  key: keyof AthleteThresholds;
  from: number | null;
  to: number | null;
};

export type GarminPushStaleness = {
  /** True when a threshold this session's targets depend on moved since the push. */
  stale: boolean;
  changed: GarminThresholdChange[];
};

const FRESH: GarminPushStaleness = { stale: false, changed: [] };

/**
 * Detect a session already on the watch whose targets no longer match the athlete.
 *
 * The session itself is unchanged here — the thresholds moved underneath it, which
 * is invisible to `garminPushClearOnSessionChange`. Comparing only the references
 * the prescription actually uses keeps an FTP update from flagging a run session.
 */
export function garminPushStaleness(input: {
  prescription: EndurancePrescription | null;
  pushedThresholds: Partial<AthleteThresholds> | null;
  currentThresholds: AthleteThresholds;
  hasPush: boolean;
}): GarminPushStaleness {
  if (!input.hasPush || !input.prescription || !input.pushedThresholds) return FRESH;

  const changed = thresholdKeysUsedBy(input.prescription)
    .map((key) => ({
      key,
      from: input.pushedThresholds?.[key] ?? null,
      to: input.currentThresholds[key] ?? null,
    }))
    .filter((change) => change.from !== change.to);

  return { stale: changed.length > 0, changed };
}

/** Narrow a threshold bag read back from Json — unknown shapes degrade to null. */
export function parsePushedThresholds(raw: unknown): Partial<AthleteThresholds> | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const numberOrNull = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  return {
    runThresholdPaceSecPerKm: numberOrNull(record.runThresholdPaceSecPerKm),
    ftpW: numberOrNull(record.ftpW),
    lthr: numberOrNull(record.lthr),
    maxHr: numberOrNull(record.maxHr),
  };
}

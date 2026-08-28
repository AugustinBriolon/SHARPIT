/**
 * Helpers for Garmin workout push dedupe, calendar status and staleness.
 * Sport-agnostic and pure where possible — network checks live in the
 * per-sport push modules.
 */
import { Prisma } from '@prisma/client';

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
  if (!value || typeof value !== 'object') {
    return false;
  }
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
  if (!touched) {
    return null;
  }
  return {
    garminWorkoutId: null,
    garminWorkoutScheduledDate: null,
    garminWorkoutPushedAt: null,
    garminWorkoutThresholds: Prisma.DbNull,
  };
}

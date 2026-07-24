/**
 * Helpers for Garmin strength workout push dedupe / calendar status.
 * Pure where possible — network checks live in garmin-strength-workout.ts.
 */

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
  date?: unknown;
}): {
  garminWorkoutId: null;
  garminWorkoutScheduledDate: null;
  garminWorkoutPushedAt: null;
} | null {
  if (!('strengthPrescription' in patch) && !('date' in patch)) return null;
  return {
    garminWorkoutId: null,
    garminWorkoutScheduledDate: null,
    garminWorkoutPushedAt: null,
  };
}

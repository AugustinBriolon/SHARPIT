import type { ClientPlannedSession } from '@/lib/query/types';
import {
  easeEndurancePrescription,
  easeStrengthPrescription,
} from '@/lib/planned-session/ease-prescription';
import {
  parseEndurancePrescription,
  type EndurancePrescription,
} from '@/lib/planned-session/endurance/endurance-prescription';
import {
  parseStrengthPrescription,
  type StrengthPrescription,
} from '@/lib/planned-session/strength/strength-prescription';

/**
 * The two adjustments an athlete makes to a plan without rewriting it.
 *
 * Both are computed here rather than in the component, so the thread and any
 * future caller agree on what "alléger" means — and so the undo is exactly the
 * previous values rather than a second guess at them.
 */

/** How much of a session is left when it is eased. Not a taper — a bad day. */
const EASE_FACTOR = 0.75;

export type SessionAdjustment = {
  readonly date?: Date;
  /** The déroulé, eased alongside the figures that summarise it. */
  readonly endurancePrescription?: EndurancePrescription;
  readonly strengthPrescription?: StrengthPrescription;
  /** "HH:mm" local, stored apart from the day — see `rescheduleSession`. */
  readonly startTime?: string | null;
  readonly durationMin?: number | null;
  readonly load?: number | null;
};

/**
 * `PlannedSession.date` is a `@db.Date`: a calendar day held at UTC midnight,
 * with no meaningful time inside it. Reading it with local getters turns that
 * midnight into 02:00 east of Greenwich and into the previous evening west of it,
 * so both directions have to go through UTC or the day silently shifts.
 */
function utcDayOf(date: Date): Date {
  const at = new Date(date);
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/** The calendar day a stored date stands for, as `yyyy-MM-dd`. */
export function plannedDayKey(date: Date | string): string {
  const at = new Date(date);
  const month = String(at.getUTCMonth() + 1).padStart(2, '0');
  const day = String(at.getUTCDate()).padStart(2, '0');
  return `${at.getUTCFullYear()}-${month}-${day}`;
}

/** Round to the nearest five minutes: nobody plans a 41-minute session. */
function roundMinutes(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

/** Same session, one calendar day later. */
export function shiftByOneDay(session: Pick<ClientPlannedSession, 'date'>): SessionAdjustment {
  const next = utcDayOf(session.date);
  next.setUTCDate(next.getUTCDate() + 1);
  return { date: next };
}

/**
 * A quarter off the session, in duration and in load together.
 *
 * Cutting one without the other would leave the plan claiming an hour of work at
 * the original cost, and every load figure downstream would inherit the lie.
 */
function buildEaseAdjustment(
  session: Pick<
    ClientPlannedSession,
    'durationMin' | 'load' | 'endurancePrescription' | 'strengthPrescription'
  >,
  easedEndurance: ReturnType<typeof easeEndurancePrescription>,
  easedStrength: ReturnType<typeof easeStrengthPrescription>,
): SessionAdjustment {
  const hasDuration = (session.durationMin !== undefined && session.durationMin !== null) && session.durationMin > 0;
  const hasLoad = (session.load !== undefined && session.load !== null) && session.load > 0;
  const adjustment: SessionAdjustment = {
    durationMin: hasDuration
      ? roundMinutes(session.durationMin! * EASE_FACTOR)
      : session.durationMin,
    load: hasLoad ? Math.round(session.load! * EASE_FACTOR) : session.load,
  };
  if (easedEndurance) {
    Object.assign(adjustment, { endurancePrescription: easedEndurance });
  }
  if (easedStrength) {
    Object.assign(adjustment, { strengthPrescription: easedStrength });
  }
  return adjustment;
}

function hasEaseableContent(
  session: Pick<ClientPlannedSession, 'durationMin' | 'load'>,
  easedEndurance: unknown,
  easedStrength: unknown,
): boolean {
  const hasDuration = (session.durationMin !== undefined && session.durationMin !== null) && session.durationMin > 0;
  const hasLoad = (session.load !== undefined && session.load !== null) && session.load > 0;
  return Boolean(hasDuration || hasLoad || easedEndurance || easedStrength);
}

export function easeSession(
  session: Pick<
    ClientPlannedSession,
    'durationMin' | 'load' | 'endurancePrescription' | 'strengthPrescription'
  >,
): SessionAdjustment | null {
  const endurance = parseEndurancePrescription(session.endurancePrescription);
  const easedEndurance = endurance ? easeEndurancePrescription(endurance) : null;
  const strength = parseStrengthPrescription(session.strengthPrescription);
  const easedStrength = strength ? easeStrengthPrescription(strength) : null;

  if (!hasEaseableContent(session, easedEndurance, easedStrength)) {
    return null;
  }

  return buildEaseAdjustment(session, easedEndurance, easedStrength);
}

/**
 * Same session, on a day and at a time the athlete picked.
 *
 * Day and clock are two columns, not one instant: `date` holds the calendar day
 * and `startTime` the "HH:mm" the athlete reads. Folding the clock into the date
 * would write a time nothing else reads and leave the displayed one untouched.
 *
 * `targetDay` is interpreted in local calendar terms — it comes from a date input
 * the athlete filled — and stored as the UTC midnight that stands for that day.
 */
export function rescheduleSession(
  session: Pick<ClientPlannedSession, 'date' | 'startTime'>,
  targetDay: { year: number; month: number; day: number },
  startTime: string | null,
): SessionAdjustment | null {
  const next = new Date(Date.UTC(targetDay.year, targetDay.month - 1, targetDay.day));
  const sameDay = next.getTime() === utcDayOf(session.date).getTime();
  const sameTime = (startTime ?? null) === (session.startTime ?? null);

  // Confirming what is already true is not a move.
  if (sameDay && sameTime) {
    return null;
  }

  const adjustment: SessionAdjustment = {};
  if (!sameDay) {
    Object.assign(adjustment, { date: next });
  }
  if (!sameTime) {
    Object.assign(adjustment, { startTime });
  }
  return adjustment;
}

/** The values to write back to put a session exactly as it was. */
export function undoOf(
  session: Pick<
    ClientPlannedSession,
    'date' | 'startTime' | 'durationMin' | 'load' | 'endurancePrescription' | 'strengthPrescription'
  >,
  applied: SessionAdjustment,
): SessionAdjustment {
  const previous: SessionAdjustment = {};
  if (applied.date !== undefined) {
    Object.assign(previous, { date: utcDayOf(session.date) });
  }
  if (applied.startTime !== undefined) {
    Object.assign(previous, { startTime: session.startTime ?? null });
  }
  if (applied.durationMin !== undefined) {
    Object.assign(previous, { durationMin: session.durationMin });
  }
  if (applied.load !== undefined) {
    Object.assign(previous, { load: session.load });
  }
  if (applied.endurancePrescription !== undefined) {
    Object.assign(previous, {
      endurancePrescription: parseEndurancePrescription(session.endurancePrescription),
    });
  }
  if (applied.strengthPrescription !== undefined) {
    Object.assign(previous, {
      strengthPrescription: parseStrengthPrescription(session.strengthPrescription),
    });
  }
  return previous;
}

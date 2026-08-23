import type { ClientPlannedSession } from '@/lib/query/types';

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
  readonly durationMin?: number | null;
  readonly load?: number | null;
};

/** Round to the nearest five minutes: nobody plans a 41-minute session. */
function roundMinutes(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

/** Same session, one day later. */
export function shiftByOneDay(session: Pick<ClientPlannedSession, 'date'>): SessionAdjustment {
  const next = new Date(session.date);
  next.setDate(next.getDate() + 1);
  return { date: next };
}

/**
 * A quarter off the session, in duration and in load together.
 *
 * Cutting one without the other would leave the plan claiming an hour of work at
 * the original cost, and every load figure downstream would inherit the lie.
 */
export function easeSession(
  session: Pick<ClientPlannedSession, 'durationMin' | 'load'>,
): SessionAdjustment | null {
  const hasDuration = session.durationMin != null && session.durationMin > 0;
  const hasLoad = session.load != null && session.load > 0;
  // Nothing to reduce — refuse rather than write a no-op the athlete would have
  // to undo without anything having changed.
  if (!hasDuration && !hasLoad) return null;

  return {
    durationMin: hasDuration
      ? roundMinutes(session.durationMin! * EASE_FACTOR)
      : session.durationMin,
    load: hasLoad ? Math.round(session.load! * EASE_FACTOR) : session.load,
  };
}

/**
 * Same session, on a day the athlete picked.
 *
 * The clock is carried over rather than reset: a session planned for 7 a.m. that
 * moves to Thursday is still a 7 a.m. session, and dropping it to midnight would
 * quietly reorder it against everything else that day.
 */
export function moveToDay(
  session: Pick<ClientPlannedSession, 'date'>,
  target: Date,
): SessionAdjustment | null {
  const from = new Date(session.date);
  const next = new Date(target);
  next.setHours(from.getHours(), from.getMinutes(), 0, 0);

  // Dropping a session back where it already was is not a move.
  if (next.toDateString() === from.toDateString()) return null;
  return { date: next };
}

/** The values to write back to put a session exactly as it was. */
export function undoOf(
  session: Pick<ClientPlannedSession, 'date' | 'durationMin' | 'load'>,
  applied: SessionAdjustment,
): SessionAdjustment {
  const previous: SessionAdjustment = {};
  if (applied.date !== undefined) Object.assign(previous, { date: new Date(session.date) });
  if (applied.durationMin !== undefined) {
    Object.assign(previous, { durationMin: session.durationMin });
  }
  if (applied.load !== undefined) Object.assign(previous, { load: session.load });
  return previous;
}

import type { SessionExecutionState } from './types';

const SKIPPED_AFTER_HOURS = 72;

/**
 * Derives session-execution state from PlannedSession's own fields — never persisted
 * separately (see ADR-006). `hadPlannedSession` distinguishes "no session was ever
 * created" (NOT_SCHEDULED) from "a session existed but no longer resolves" (SUPERSEDED,
 * e.g. removed via coach/adapt) when `session` is null.
 */
export function deriveSessionExecutionState(
  session: { completed: boolean; activityId: string | null; date: Date } | null,
  now: Date,
  hadPlannedSession: boolean,
): SessionExecutionState {
  if (!session) {
    return hadPlannedSession ? 'SUPERSEDED' : 'NOT_SCHEDULED';
  }
  if (session.completed && session.activityId) {
    return 'COMPLETED';
  }
  const hoursSinceSession = (now.getTime() - session.date.getTime()) / 3_600_000;
  if (!session.completed && hoursSinceSession > SKIPPED_AFTER_HOURS) {
    return 'SKIPPED';
  }
  return 'SCHEDULED';
}

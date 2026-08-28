/**
 * What actually happened, against what was asked.
 *
 * This is the whole point of merging planning and history into one list: a
 * completed session shown alone says nothing, and the same session shown beside
 * its prescription says whether the plan is being held. So a delta is only ever
 * produced when both sides exist — never inferred, never defaulted to zero.
 */

/**
 * How far a session may drift before it stops being the session that was asked for.
 *
 * Fifteen percent, not ten: eight minutes over an hour is the ordinary shape of a
 * long run that ran long, and flagging it amber would make the warning colour
 * appear on sessions that went fine — which is how a warning stops being read.
 * Past this the athlete did something else, and the screen should say so.
 */
export const THREAD_DELTA_TOLERANCE = 0.15;

export type ThreadDelta = {
  /** Signed difference, in the unit of the compared field. */
  readonly value: number;
  /** Same difference as a share of what was prescribed. */
  readonly ratio: number;
  /** `within` reads as neutral, `over` as something to notice. */
  readonly verdict: 'within' | 'over';
};

function toDelta(actual: number, planned: number): ThreadDelta | null {
  if (!Number.isFinite(actual) || !Number.isFinite(planned) || planned <= 0) {
    return null;
  }
  const value = actual - planned;
  const ratio = value / planned;
  return {
    value,
    ratio,
    verdict: Math.abs(ratio) <= THREAD_DELTA_TOLERANCE ? 'within' : 'over',
  };
}

/** Minutes done vs minutes prescribed. Activity duration is stored in seconds. */
export function durationDelta(
  actualSeconds: number | null | undefined,
  plannedMinutes: number | null | undefined,
): ThreadDelta | null {
  if (actualSeconds === null || plannedMinutes === null) {
    return null;
  }
  return toDelta(Math.round(actualSeconds / 60), plannedMinutes);
}

/** Load done vs load prescribed, both already in TSS. */
export function loadDelta(
  actualLoad: number | null | undefined,
  plannedLoad: number | null | undefined,
): ThreadDelta | null {
  if (actualLoad === null || plannedLoad === null) {
    return null;
  }
  return toDelta(Math.round(actualLoad), Math.round(plannedLoad));
}

/** "+8 min", "−12 TSS" — the sign is always shown, including for a shortfall. */
export function formatDelta(delta: ThreadDelta, unit: string): string {
  const rounded = Math.round(delta.value);
  if (rounded === 0) {
    return `±0 ${unit}`.trim();
  }
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${Math.abs(rounded)} ${unit}`.trim();
}

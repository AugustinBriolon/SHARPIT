/**
 * Brick legs are consecutive, not simultaneous — a bike followed by a run, not a
 * bike and a run at the same hour. Every leg used to be stamped with the brick's
 * single `startTime`, so the calendar received overlapping events.
 *
 * Pure: no I/O, no Prisma. Shared by the brick API route and the coach tool, the
 * two places that create a brick.
 */

/** A leg that declares no duration still has to occupy the calendar. */
const DEFAULT_LEG_MIN = 60;

const LAST_MINUTE_OF_DAY = 24 * 60 - 1;

const HHMM = /^(\d{1,2}):(\d{2})$/;

export type BrickLegDuration = {
  readonly durationMin?: number | null;
};

/** Local `HH:mm` → minutes past midnight, or null when unparseable. */
function parseHHmm(value: string): number | null {
  const match = HHMM.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatHHmm(totalMinutes: number): string {
  const clamped = Math.min(Math.max(totalMinutes, 0), LAST_MINUTE_OF_DAY);
  const hours = String(Math.floor(clamped / 60)).padStart(2, '0');
  const minutes = String(clamped % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function legSpanMinutes(leg: BrickLegDuration): number {
  const declared = leg.durationMin;
  return typeof declared === 'number' && declared > 0 ? declared : DEFAULT_LEG_MIN;
}

/**
 * One start time per leg, chained end to end from the brick's own start.
 *
 * Returns a null per leg when the brick declares no usable start: the legs stay
 * untimed, and the calendar push resolves a slot for them — in order, so the
 * second one is placed after the first rather than on top of it.
 */
export function chainBrickLegStartTimes(
  startTime: string | null | undefined,
  legs: readonly BrickLegDuration[],
): (string | null)[] {
  const base = startTime?.trim() ? parseHHmm(startTime) : null;
  if (base === null) {
    return legs.map(() => null);
  }

  let cursor = base;
  const times: (string | null)[] = [];
  for (const leg of legs) {
    times.push(formatHHmm(cursor));
    cursor += legSpanMinutes(leg);
  }
  return times;
}

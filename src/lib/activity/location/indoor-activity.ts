import type { ActivityType } from '@prisma/client';

/**
 * Title/notes heuristics for indoor / virtual / trainer sessions.
 * Used to skip outdoor weather enrichment and env corrections.
 * Prefer provider typeKey persistence long-term; this is the safe no-schema gate.
 */
export const INDOOR_ACTIVITY_HINTS =
  /home\s*trainer|smart\s*trainer|indoor|intérieur|tapis|rulle?r|rouleau|zwift|trainerroad|kinomap|rouvy|bkool|wahoo\s*systm|mywhoosh|fulgaz/i;

export type IndoorActivitySignals = {
  type: ActivityType;
  title?: string | null;
  notes?: string | null;
};

/**
 * True when environmental outdoor weather must not apply.
 * STRENGTH is always indoor; BIKE/RUN can be indoor via title (Zwift, home trainer…).
 */
export function isIndoorActivitySession(activity: IndoorActivitySignals): boolean {
  if (activity.type === 'STRENGTH') return true;
  const haystack = [activity.title, activity.notes]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
  if (!haystack) return false;
  return INDOOR_ACTIVITY_HINTS.test(haystack);
}

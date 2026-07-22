/**
 * Canonical coach discuss deep-links.
 * CoachView bootstraps a new conversation and prefills the matching prompt.
 */

export type CoachDiscussTarget =
  | { kind: 'planned-session'; sessionId: string }
  | { kind: 'activity'; activityId: string }
  | { kind: 'planning'; horizonDays: 1 | 3 | 7 | 14 };

export function coachDiscussHref(target: CoachDiscussTarget): string {
  switch (target.kind) {
    case 'planned-session':
      return `/coach?discuss=${encodeURIComponent(target.sessionId)}`;
    case 'activity':
      return `/coach?discussActivity=${encodeURIComponent(target.activityId)}`;
    case 'planning':
      return `/coach?discussPlanning=${target.horizonDays}`;
  }
}

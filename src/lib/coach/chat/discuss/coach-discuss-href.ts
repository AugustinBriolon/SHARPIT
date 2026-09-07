/**
 * Canonical coach discuss deep-links.
 * CoachView bootstraps a new conversation and prefills the matching prompt.
 *
 * Every athlete surface named in the Information Architecture can start a
 * contextual conversation: Today, a planned session, an activity, the week,
 * a goal, a record, and an active physical constraint (ADR-022).
 */

export type CoachDiscussTarget =
  | { kind: 'today' }
  | { kind: 'planned-session'; sessionId: string }
  | { kind: 'activity'; activityId: string }
  | { kind: 'planning'; horizonDays: 1 | 3 | 7 | 14 }
  | { kind: 'goal'; goalId: string }
  | { kind: 'record'; categoryKey: string }
  | { kind: 'physical-condition'; noteId: string };

export function coachDiscussHref(target: CoachDiscussTarget): string {
  switch (target.kind) {
    case 'today':
      return '/coach?discussToday=1';
    case 'planned-session':
      return `/coach?discuss=${encodeURIComponent(target.sessionId)}`;
    case 'activity':
      return `/coach?discussActivity=${encodeURIComponent(target.activityId)}`;
    case 'planning':
      return `/coach?discussPlanning=${target.horizonDays}`;
    case 'goal':
      return `/coach?discussGoal=${encodeURIComponent(target.goalId)}`;
    case 'record':
      return `/coach?discussRecord=${encodeURIComponent(target.categoryKey)}`;
    case 'physical-condition':
      return `/coach?discussCondition=${encodeURIComponent(target.noteId)}`;
  }
}

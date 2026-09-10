/**
 * Canonical coach discuss deep-links.
 * CoachView bootstraps a new conversation and attaches the matching context chip.
 * The composer stays empty — the athlete writes; context is the chip only (IA contract).
 *
 * Every athlete surface named in the Information Architecture can start a
 * contextual conversation: Today, a planned session, an activity, the week,
 * a goal, a record, an active physical constraint, and journal analyses.
 */

export type CoachDiscussTarget =
  | { kind: 'today' }
  | { kind: 'planned-session'; sessionId: string }
  | { kind: 'activity'; activityId: string }
  | { kind: 'planning'; horizonDays: 1 | 3 | 7 | 14 }
  | { kind: 'goal'; goalId: string }
  | { kind: 'record'; categoryKey: string }
  | { kind: 'physical-condition'; noteId: string }
  | { kind: 'journal-analyses' };

type HrefBuilders = {
  [K in CoachDiscussTarget['kind']]: (target: Extract<CoachDiscussTarget, { kind: K }>) => string;
};

const HREF_BUILDERS: HrefBuilders = {
  today: () => '/coach?discussToday=1',
  'planned-session': (t) => `/coach?discuss=${encodeURIComponent(t.sessionId)}`,
  activity: (t) => `/coach?discussActivity=${encodeURIComponent(t.activityId)}`,
  planning: (t) => `/coach?discussPlanning=${t.horizonDays}`,
  goal: (t) => `/coach?discussGoal=${encodeURIComponent(t.goalId)}`,
  record: (t) => `/coach?discussRecord=${encodeURIComponent(t.categoryKey)}`,
  'physical-condition': (t) => `/coach?discussCondition=${encodeURIComponent(t.noteId)}`,
  'journal-analyses': () => '/coach?discussJournalAnalyses=1',
};

export function coachDiscussHref(target: CoachDiscussTarget): string {
  // Correlated union: TS cannot tie the looked-up builder to this target's kind.
  const build = HREF_BUILDERS[target.kind] as (t: CoachDiscussTarget) => string;
  return build(target);
}

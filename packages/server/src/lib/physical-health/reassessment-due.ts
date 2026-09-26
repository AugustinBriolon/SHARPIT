/**
 * When to ask the athlete for news about a pain or injury.
 *
 * The follow-up used to exist only when the coach model happened to ask for it
 * inside a session analysis: no analysis, no linked activity, no credits — no
 * question, ever, and nothing ever came back to it. This rule is deterministic
 * and owns the loop; the model may still phrase the question, it no longer
 * decides whether one is asked.
 *
 * Pure: no I/O, no React.
 */

export type ReassessmentTrigger = 'after_session' | 'silence';

export type ReassessmentNote = {
  id: string;
  title: string;
  category: string;
  status: string;
  severity: number | null;
  resolvedAt: Date | string | null;
  checkins: readonly { createdAt: Date | string }[];
};

export type ReassessmentDue = {
  noteId: string;
  noteTitle: string;
  trigger: ReassessmentTrigger;
  /** Null when the condition has never been followed up since it was declared. */
  daysSinceLastObservation: number | null;
  suggestedSeverity: number | null;
};

/** Only what actually constrains training is worth interrupting the athlete for. */
const FOLLOWED_CATEGORIES = new Set(['PAIN', 'INJURY']);
const FOLLOWED_STATUSES = new Set(['ACTIVE', 'MONITORING']);

/**
 * How long silence is acceptable. A painful condition earns a question sooner:
 * that is where the athlete's own reading changes fastest.
 */
export const SILENCE_DAYS = { high: 3, moderate: 5, low: 8 } as const;

export function silenceThresholdDays(severity: number | null): number {
  if (severity === null) {
    return SILENCE_DAYS.moderate;
  }
  if (severity >= 6) {
    return SILENCE_DAYS.high;
  }
  return severity >= 3 ? SILENCE_DAYS.moderate : SILENCE_DAYS.low;
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function lastObservationTime(note: ReassessmentNote): number | null {
  const times = note.checkins.map((checkin) => toTime(checkin.createdAt));
  return times.length > 0 ? Math.max(...times) : null;
}

export function isFollowedCondition(note: ReassessmentNote): boolean {
  if (note.resolvedAt !== null) {
    return false;
  }
  return FOLLOWED_CATEGORIES.has(note.category) && FOLLOWED_STATUSES.has(note.status);
}

function daysBetween(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / 86_400_000);
}

/**
 * A session the athlete actually did is the moment their body answered the
 * question for them — ask while it is still fresh.
 */
function answeredSince(note: ReassessmentNote, sinceMs: number): boolean {
  return note.checkins.some((checkin) => toTime(checkin.createdAt) >= sinceMs);
}

function afterSessionDue(
  note: ReassessmentNote,
  lastRealisedSessionAt: Date | string | null,
  now: Date,
): boolean {
  if (!lastRealisedSessionAt) {
    return false;
  }
  const sessionMs = toTime(lastRealisedSessionAt);
  return sessionMs <= now.getTime() && !answeredSince(note, sessionMs);
}

export function reassessmentDue(input: {
  note: ReassessmentNote;
  /** Most recent realised session that could have loaded the condition. */
  lastRealisedSessionAt: Date | string | null;
  now: Date;
}): ReassessmentDue | null {
  const { note, now } = input;
  if (!isFollowedCondition(note)) {
    return null;
  }

  const lastObservation = lastObservationTime(note);
  const daysSinceLastObservation =
    lastObservation === null ? null : daysBetween(lastObservation, now.getTime());
  const base = {
    noteId: note.id,
    noteTitle: note.title,
    daysSinceLastObservation,
    suggestedSeverity: note.severity,
  };

  if (afterSessionDue(note, input.lastRealisedSessionAt, now)) {
    return { ...base, trigger: 'after_session' };
  }

  const silentEnough =
    daysSinceLastObservation !== null &&
    daysSinceLastObservation >= silenceThresholdDays(note.severity);

  return silentEnough ? { ...base, trigger: 'silence' } : null;
}

/** Every condition currently owed a check-in, worst first. */
export function dueReassessments(input: {
  notes: readonly ReassessmentNote[];
  lastRealisedSessionAt: Date | string | null;
  now: Date;
}): ReassessmentDue[] {
  return input.notes
    .map((note) =>
      reassessmentDue({
        note,
        lastRealisedSessionAt: input.lastRealisedSessionAt,
        now: input.now,
      }),
    )
    .filter((due): due is ReassessmentDue => due !== null)
    .sort((a, b) => (b.suggestedSeverity ?? 0) - (a.suggestedSeverity ?? 0));
}

/** The question the athlete reads — says why it is being asked now. */
export function reassessmentQuestion(due: ReassessmentDue): string {
  if (due.trigger === 'after_session') {
    return `Comment va « ${due.noteTitle} » après cette séance ?`;
  }
  const days = due.daysSinceLastObservation;
  if (days === null) {
    return `Où en est « ${due.noteTitle} » ?`;
  }
  return `Pas de nouvelles de « ${due.noteTitle} » depuis ${days} jours. Où en est-ce ?`;
}

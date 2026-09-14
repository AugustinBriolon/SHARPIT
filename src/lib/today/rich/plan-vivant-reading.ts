/**
 * Plan vivant, said in French rather than in glyphs.
 *
 * The band first showed « J-27 · Sub 6h » beside seven unlabelled dots. Two
 * unrelated facts joined by a separator, and a strip whose legend existed
 * nowhere: at six pixels, filled / hollow / ringed cannot be decoded, so it was
 * decoration — which the design law forbids. Every element here reads as words.
 *
 * Pure: no I/O, no React.
 */

export type PlanVivantWeekCount = {
  /** 'adapted' | 'done' | 'remaining' — the ids the suivi VM emits. */
  readonly id: string;
  /** Count, as the VM formats it. */
  readonly dateLabel: string;
  readonly intensityLabel: string;
};

function parseCount(label: string): number {
  const parsed = Number.parseInt(label, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function countOf(segments: readonly PlanVivantWeekCount[], id: string): number {
  const segment = segments.find((entry) => entry.id === id);
  return segment ? parseCount(segment.dateLabel) : 0;
}

/** « J-27 » → 27. Returns null when the headline carries no countdown. */
export function daysFromHeadline(headline: string): number | null {
  const match = /J-(\d+)/.exec(headline);
  if (!match) {
    return null;
  }
  const days = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(days) ? days : null;
}

/** Drops the city so the clause stays short: « Half IronMan Versailles » → « Half IronMan ». */
function shortGoal(goalLabel: string): string {
  return goalLabel.split(/\s+[-–—]\s+/)[0]?.trim() || goalLabel;
}

/**
 * What the athlete is heading toward, in plain words.
 * « Half IronMan dans 27 jours » — never « J-27 · Sub 6h ».
 */
export function goalClause(input: {
  goalLabel: string | null;
  headline: string;
  progress: number | null;
}): string {
  if (input.progress !== null) {
    const goal = input.goalLabel ? `${shortGoal(input.goalLabel)} — ` : '';
    return `${goal}${input.progress} % de la cible`;
  }

  const days = daysFromHeadline(input.headline);
  if (days === null) {
    return input.goalLabel ? shortGoal(input.goalLabel) : input.headline;
  }
  const when = days === 0 ? 'aujourd’hui' : `dans ${days} jour${days > 1 ? 's' : ''}`;
  return input.goalLabel ? `${shortGoal(input.goalLabel)} ${when}` : when;
}

/**
 * The week, counted out loud. Null when there is nothing to count — the caller
 * then says so itself rather than printing an empty clause.
 */
export function weekClause(segments: readonly PlanVivantWeekCount[]): string | null {
  const done = countOf(segments, 'done');
  const remaining = countOf(segments, 'remaining');
  const total = done + remaining;

  if (total === 0) {
    return null;
  }
  if (remaining === 0) {
    return `semaine bouclée, ${done} séance${done > 1 ? 's' : ''}`;
  }
  if (done === 0) {
    return `${remaining} séance${remaining > 1 ? 's' : ''} cette semaine`;
  }
  return `${done} faite${done > 1 ? 's' : ''} sur ${total} cette semaine`;
}

export type PlanVivantPhase = {
  readonly label: string;
  readonly current: boolean;
};

export type PlanVivantProgress = {
  /** Segments to draw. 1 for a percentage, one per block for a race. */
  readonly total: number;
  /** How many read as covered — includes the block in progress. */
  readonly filled: number;
  /** 0–100 when the goal carries a percentage, else null. */
  readonly percent: number | null;
  /** What to name beside the bar. */
  readonly label: string | null;
};

/**
 * The glanceable progress toward the goal.
 *
 * A race has no percentage: the honest axis is periodisation — which block you
 * are in, out of those the plan lays down. A metric goal has its own number, so
 * the bar becomes that single fill.
 */
export function planVivantProgress(input: {
  progress: number | null;
  phases: readonly PlanVivantPhase[];
}): PlanVivantProgress | null {
  if (input.progress !== null) {
    const percent = Math.min(100, Math.max(0, input.progress));
    return { total: 1, filled: 1, percent, label: `${percent} %` };
  }

  const currentIndex = input.phases.findIndex((phase) => phase.current);
  if (input.phases.length === 0 || currentIndex < 0) {
    return null;
  }
  return {
    total: input.phases.length,
    filled: currentIndex + 1,
    percent: null,
    label: input.phases[currentIndex]?.label ?? null,
  };
}

/** The whole reading: where you are heading, and where the week stands. */
export function planVivantReading(input: {
  goalLabel: string | null;
  headline: string;
  progress: number | null;
  segments: readonly PlanVivantWeekCount[];
  /** Shown when the week holds nothing at all. */
  emptyWeekClause?: string;
}): string {
  const week = weekClause(input.segments) ?? input.emptyWeekClause ?? null;
  const goal = goalClause({
    goalLabel: input.goalLabel,
    headline: input.headline,
    progress: input.progress,
  });
  return week ? `${goal} — ${week}` : goal;
}

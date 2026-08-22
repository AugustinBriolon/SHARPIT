import type { ActivityType } from '@prisma/client';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

/**
 * One continuous view of training, prescribed and performed in the same flow.
 *
 * The hub used to answer three questions across five routes: am I on plan, what
 * did I do, am I improving. Planning held the future, History held the past, and
 * neither ever showed one against the other — which is the only comparison that
 * tells an athlete anything. Here they are the same list.
 *
 * The pairing is not invented: `Activity.plannedSession` is a real relation,
 * already selected by `activityListSelect`. This layer only reads it.
 */

/** A session that happened, with the prescription it answers to when there was one. */
export type ThreadEntry = {
  /** Stable across a re-window: the activity id when done, else the planned id. */
  readonly id: string;
  readonly dayKey: string;
  readonly type: ActivityType;
  readonly title: string;
  /** `done` — performed, unplanned. `planned` — prescribed, not yet done.
   *  `paired` — performed against a prescription, so the two can be compared. */
  readonly kind: 'done' | 'planned' | 'paired';
  readonly activity: ClientActivity | null;
  readonly planned: ClientPlannedSession | null;
};

export type ThreadDay = {
  readonly dayKey: string;
  readonly date: Date;
  readonly entries: readonly ThreadEntry[];
};

export type ThreadWeek = {
  /** ISO week key, `2026-W34`. */
  readonly weekKey: string;
  readonly label: string;
  readonly start: Date;
  readonly days: readonly ThreadDay[];
  /** Load actually recorded this week. */
  readonly doneLoad: number;
  /**
   * Whether any completed session this week carried a load at all.
   *
   * Without this a week of five sessions that never got a TSS reads "0", and a
   * zero that means "not measured" is worse than no figure: it says the athlete
   * did nothing on a week he trained five times.
   */
  readonly doneLoadKnown: boolean;
  /** Load the plan asks for this week. */
  readonly plannedLoad: number;
  readonly isCurrent: boolean;
  /** Wholly ahead of the pivot — drawn as outline, never as fact. */
  readonly isFuture: boolean;
};

/**
 * Goal Cap stats — volume linked to one objective since it started.
 * Presentation aggregation only: PlannedSession.goalId + Activity duration/load.
 * Core stays frozen. No per-session history (aggregates only).
 */

import type { ActivityType } from '@prisma/client';
import { dayKeyFromDate } from '@sharpit/app/lib/date/day-key';
import { activityTypeLabels, formatDuration } from '@sharpit/app/lib/format';
import { isSet } from '@sharpit/shared/value';

export type GoalCapStatsSession = {
  readonly id: string;
  readonly goalId: string | null;
  readonly date: Date | string;
  readonly completed: boolean;
  readonly activityId: string | null;
  readonly durationMin: number | null;
  readonly load: number | null;
  readonly type?: ActivityType | null;
};

export type GoalCapStatsActivity = {
  readonly id: string;
  readonly duration: number | null;
  readonly load: number | null;
  readonly type?: ActivityType | null;
};

export type GoalCapSportShare = {
  readonly type: ActivityType;
  readonly label: string;
  readonly sessions: number;
  readonly durationSeconds: number;
  readonly durationLabel: string;
  /** 0–100 share of done sessions — visual mix only, not goal progress. */
  readonly sessionSharePct: number;
  /** 0–100 share of measured duration — visual mix only, not goal progress. */
  readonly durationSharePct: number;
};

export type GoalCapStatsView = {
  readonly sessionsDone: number;
  readonly durationSeconds: number;
  readonly durationLabel: string;
  readonly loadTotal: number | null;
  readonly loadLabel: string | null;
  readonly hasLinkedSessions: boolean;
  readonly avgDurationLabel: string | null;
  readonly weeksSpanned: number;
  readonly sessionsPerWeekLabel: string | null;
  readonly sportShares: readonly GoalCapSportShare[];
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function sessionDayKey(date: Date | string): string {
  return dayKeyFromDate(asDate(date));
}

function calendarDayKey(date: Date): string {
  return dayKeyFromDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
}

function isDone(session: GoalCapStatsSession): boolean {
  return session.completed || Boolean(session.activityId);
}

function durationSecondsOf(
  session: GoalCapStatsSession,
  activity: GoalCapStatsActivity | undefined,
): number {
  if (isSet(activity?.duration) && activity.duration > 0) {
    return activity.duration;
  }
  if (isSet(session.durationMin) && session.durationMin > 0) {
    return session.durationMin * 60;
  }
  return 0;
}

function loadOf(
  session: GoalCapStatsSession,
  activity: GoalCapStatsActivity | undefined,
): number | null {
  if (isSet(activity?.load) && Number.isFinite(activity.load)) {
    return activity.load;
  }
  if (isSet(session.load) && Number.isFinite(session.load)) {
    return session.load;
  }
  return null;
}

function weeksSpannedSince(start: Date, now: Date): number {
  const startKey = calendarDayKey(start);
  const nowKey = calendarDayKey(now);
  const startMs = Date.parse(`${startKey}T00:00:00.000Z`);
  const nowMs = Date.parse(`${nowKey}T00:00:00.000Z`);
  const daySpan = Math.max(1, Math.round((nowMs - startMs) / 86_400_000) + 1);
  return daySpan / 7;
}

type Acc = {
  sessionsDone: number;
  durationSeconds: number;
  loadTotal: number;
  hasLoad: boolean;
  measuredDurations: number;
  byType: Map<ActivityType, { sessions: number; durationSeconds: number }>;
};

function resolveType(
  session: GoalCapStatsSession,
  activity: GoalCapStatsActivity | undefined,
): ActivityType {
  return session.type ?? activity?.type ?? 'OTHER';
}

function accumulateDoneSession(
  acc: Acc,
  session: GoalCapStatsSession,
  activityById: ReadonlyMap<string, GoalCapStatsActivity>,
): Acc {
  if (!isDone(session)) {
    return acc;
  }

  const activity = session.activityId ? activityById.get(session.activityId) : undefined;
  const durationSec = durationSecondsOf(session, activity);
  const load = loadOf(session, activity);
  const type = resolveType(session, activity);
  const prev = acc.byType.get(type) ?? { sessions: 0, durationSeconds: 0 };
  const byType = new Map(acc.byType);
  byType.set(type, {
    sessions: prev.sessions + 1,
    durationSeconds: prev.durationSeconds + durationSec,
  });

  return {
    sessionsDone: acc.sessionsDone + 1,
    durationSeconds: acc.durationSeconds + durationSec,
    loadTotal: load !== null ? acc.loadTotal + load : acc.loadTotal,
    hasLoad: load !== null ? true : acc.hasLoad,
    measuredDurations: durationSec > 0 ? acc.measuredDurations + 1 : acc.measuredDurations,
    byType,
  };
}

function sessionsPerWeekLabel(done: number, weeks: number): string | null {
  if (done <= 0) {
    return null;
  }
  const rate = done / Math.max(weeks, 1 / 7);
  const rounded = Math.round(rate * 10) / 10;
  return `${rounded.toLocaleString('fr-FR')} / sem.`;
}

function toSportShares(
  byType: Map<ActivityType, { sessions: number; durationSeconds: number }>,
  sessionsDone: number,
  durationSeconds: number,
): GoalCapSportShare[] {
  return [...byType.entries()]
    .map(([type, bag]) => ({
      type,
      label: activityTypeLabels[type],
      sessions: bag.sessions,
      durationSeconds: bag.durationSeconds,
      durationLabel: bag.durationSeconds > 0 ? formatDuration(bag.durationSeconds) : '—',
      sessionSharePct: sessionsDone > 0 ? Math.round((bag.sessions / sessionsDone) * 100) : 0,
      durationSharePct:
        durationSeconds > 0 ? Math.round((bag.durationSeconds / durationSeconds) * 100) : 0,
    }))
    .sort(
      (left, right) =>
        right.durationSeconds - left.durationSeconds || right.sessions - left.sessions,
    );
}

/**
 * Aggregate goal-scoped volume since the goal was created.
 * Only completed / linked sessions count — not remaining planned.
 */
export function buildGoalCapStats(input: {
  goalId: string;
  goalCreatedAt: Date | string;
  now: Date;
  sessions: readonly GoalCapStatsSession[];
  activities: readonly GoalCapStatsActivity[];
}): GoalCapStatsView {
  const start = asDate(input.goalCreatedAt);
  const startKey = calendarDayKey(start);
  const activityById = new Map(input.activities.map((activity) => [activity.id, activity]));
  const linked = input.sessions.filter(
    (session) => session.goalId === input.goalId && sessionDayKey(session.date) >= startKey,
  );

  const acc = linked.reduce<Acc>(
    (state, session) => accumulateDoneSession(state, session, activityById),
    {
      sessionsDone: 0,
      durationSeconds: 0,
      loadTotal: 0,
      hasLoad: false,
      measuredDurations: 0,
      byType: new Map(),
    },
  );

  const loadRounded = acc.hasLoad ? Math.round(acc.loadTotal) : null;
  const weeks = weeksSpannedSince(start, input.now);
  const avgSec =
    acc.measuredDurations > 0 ? Math.round(acc.durationSeconds / acc.measuredDurations) : 0;

  return {
    sessionsDone: acc.sessionsDone,
    durationSeconds: acc.durationSeconds,
    durationLabel: acc.durationSeconds > 0 ? formatDuration(acc.durationSeconds) : '—',
    loadTotal: loadRounded,
    loadLabel: loadRounded !== null ? String(loadRounded) : null,
    hasLinkedSessions: linked.length > 0,
    avgDurationLabel: avgSec > 0 ? formatDuration(avgSec) : null,
    weeksSpanned: Math.round(weeks * 10) / 10,
    sessionsPerWeekLabel: sessionsPerWeekLabel(acc.sessionsDone, weeks),
    sportShares: toSportShares(acc.byType, acc.sessionsDone, acc.durationSeconds),
  };
}

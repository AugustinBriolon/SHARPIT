/**
 * The current week as one arrangement: what the plan asked for, and what
 * actually happened, on the same seven days.
 *
 * Built on `buildThread` on purpose. Plan and the training thread must not
 * disagree about whether a session counts as done, so both read the same
 * pairing rather than two rules that drift apart.
 */

import { startOfWeek } from 'date-fns';
import { dayKeyFromDate } from '@/lib/date/day-key';
import { buildThread, isoWeekKeyOf } from '@/lib/training/thread/build-thread';
import type { ThreadEntry, ThreadWeek } from '@/lib/training/thread/thread-model';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

const WEEK_OPTS = { weekStartsOn: 1 as const };

const DAYS_IN_WEEK = 7;

/** `done` — something was recorded. `planned` — still owed. `rest` — neither. */
export type PlanWeekDayState = 'done' | 'planned' | 'rest';

export type PlanWeekDay = {
  readonly dayKey: string;
  readonly date: Date;
  readonly state: PlanWeekDayState;
  readonly isToday: boolean;
  readonly entries: readonly ThreadEntry[];
};

export type PlanWeek = {
  readonly start: Date;
  readonly days: readonly PlanWeekDay[];
  /** Recorded this week, chronological. */
  readonly done: readonly ThreadEntry[];
  /** Prescribed and still owed, chronological. Includes days already past. */
  readonly remaining: readonly ThreadEntry[];
  readonly doneLoad: number;
  /**
   * False when nothing recorded carried a load at all. A week of five sessions
   * with no TSS must not read "0": a zero meaning "not measured" says the
   * athlete did nothing on a week he trained five times.
   */
  readonly doneLoadKnown: boolean;
  readonly plannedLoad: number;
  readonly isEmpty: boolean;
};

/** Same key shape as the thread builder, so days and entries line up. */
function calendarDayKey(date: Date): string {
  return dayKeyFromDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
}

function dayStateOf(entries: readonly ThreadEntry[]): PlanWeekDayState {
  if (entries.length === 0) {
    return 'rest';
  }
  return entries.some((entry) => entry.kind !== 'planned') ? 'done' : 'planned';
}

function groupByDay(entries: readonly ThreadEntry[]): Map<string, ThreadEntry[]> {
  const byDay = new Map<string, ThreadEntry[]>();
  for (const entry of entries) {
    const bucket = byDay.get(entry.dayKey);
    if (bucket) {
      bucket.push(entry);
    } else {
      byDay.set(entry.dayKey, [entry]);
    }
  }
  return byDay;
}

/** The seven calendar days, each carrying whatever the thread put on it. */
function layOutDays(start: Date, entries: readonly ThreadEntry[], now: Date): PlanWeekDay[] {
  const byDay = groupByDay(entries);
  const todayKey = calendarDayKey(now);

  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const dayKey = calendarDayKey(date);
    const dayEntries = byDay.get(dayKey) ?? [];
    return {
      dayKey,
      date,
      state: dayStateOf(dayEntries),
      isToday: dayKey === todayKey,
      entries: dayEntries,
    };
  });
}

type WeekLoads = Pick<PlanWeek, 'doneLoad' | 'doneLoadKnown' | 'plannedLoad'>;

function loadsOf(week: ThreadWeek | undefined): WeekLoads {
  if (!week) {
    return { doneLoad: 0, doneLoadKnown: false, plannedLoad: 0 };
  }
  return {
    doneLoad: week.doneLoad,
    doneLoadKnown: week.doneLoadKnown,
    plannedLoad: week.plannedLoad,
  };
}

export function buildPlanWeek({
  activities,
  plannedSessions,
  now,
}: {
  activities: readonly ClientActivity[];
  plannedSessions: readonly ClientPlannedSession[];
  now: Date;
}): PlanWeek {
  const start = startOfWeek(now, WEEK_OPTS);
  // A 7-day lookback always reaches the Monday of the current week, whatever
  // day it is today, so the week is never returned half-built.
  const weeks = buildThread({ activities, plannedSessions, pivot: now, daysBack: DAYS_IN_WEEK });
  const week = weeks.find((candidate) => candidate.weekKey === isoWeekKeyOf(now));
  const entries = week?.days.flatMap((day) => [...day.entries]) ?? [];

  return {
    start,
    days: layOutDays(start, entries, now),
    done: entries.filter((entry) => entry.kind !== 'planned'),
    remaining: entries.filter((entry) => entry.kind === 'planned'),
    ...loadsOf(week),
    isEmpty: entries.length === 0,
  };
}

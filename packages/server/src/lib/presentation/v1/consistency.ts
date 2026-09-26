/**
 * Regularity, projected for the native client.
 *
 * The web computes this in the browser from a fetched activity list. The native client
 * gets it server-side instead, for the same reason colors are generated rather than
 * transcribed (ADR-041): a second implementation of the same rule drifts from the first.
 * Both surfaces now read one calculation, `activity-consistency.ts`.
 *
 * Deliberately narrower than the web panel. `design.md` forbids habit-tracker heatmaps
 * and streak counters *as a primary signal*, and Today's first viewport is one plate, not
 * a dashboard — so the payload carries the compact day window and the week's session
 * count, not the 184-day heatmap or the streak.
 */

import {
  buildConsistencyDayWindow,
  buildProgramWeeks,
  type ActivityForConsistency,
} from '@sharpit/server/lib/activity/list/activity-consistency';

export type V1TodayConsistencyDay = {
  /** `yyyy-MM-dd`. */
  date: string;
  /** Single-letter French weekday, already uppercased. */
  weekdayLabel: string;
  dayOfMonth: number;
  hasActivity: boolean;
  isToday: boolean;
  isFuture: boolean;
};

export type V1TodayConsistency = {
  days: V1TodayConsistencyDay[];
  /** Sessions recorded in the current ISO week, today included. */
  thisWeekSessionCount: number;
};

export function projectV1Consistency(
  activities: readonly ActivityForConsistency[],
  refDate: Date,
): V1TodayConsistency {
  const source = [...activities];
  const programWeeks = buildProgramWeeks(source, refDate);
  const currentWeek = programWeeks[programWeeks.length - 1];

  return {
    days: buildConsistencyDayWindow(source, refDate).map((day) => ({
      date: day.date,
      weekdayLabel: day.weekdayLabel,
      dayOfMonth: day.dayOfMonth,
      hasActivity: day.hasActivity,
      isToday: day.isToday,
      isFuture: day.isFuture,
    })),
    thisWeekSessionCount: currentWeek?.sessionCount ?? 0,
  };
}

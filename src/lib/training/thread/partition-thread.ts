import type { ThreadDay, ThreadWeek } from './thread-model';

/**
 * Splits the thread into what is coming and what is done.
 *
 * The two halves read in opposite directions on purpose. Ahead of today, the next
 * thing is the most useful and the horizon the least, so it runs forward. Behind
 * today the opposite holds — yesterday explains how you feel this morning, and a
 * session three weeks back explains nothing — so it runs backward, most recent
 * first.
 *
 * Read top to bottom the page therefore goes: today, then nearer and nearer to
 * the horizon, then a break, then back through the recent past. Today sits at the
 * top either way, which is why the view no longer has to scroll itself on load.
 */
export type ThreadPartition = {
  /** Today and after, in the order it will happen. */
  readonly upcoming: readonly ThreadWeek[];
  /** Before today, most recent first — weeks reversed and days within them too. */
  readonly past: readonly ThreadWeek[];
};

function reverseWeek(week: ThreadWeek): ThreadWeek {
  return { ...week, days: [...week.days].reverse() };
}

export function partitionThread(
  weeks: readonly ThreadWeek[],
  pivotDayKey: string,
): ThreadPartition {
  const upcoming: ThreadWeek[] = [];
  const past: ThreadWeek[] = [];

  for (const week of weeks) {
    const ahead = week.days.filter((day) => day.dayKey >= pivotDayKey);
    const behind = week.days.filter((day) => day.dayKey < pivotDayKey);

    // A week straddling today appears on both sides, holding only its own days.
    if (ahead.length > 0) upcoming.push({ ...week, days: ahead });
    if (behind.length > 0) past.push(reverseWeek({ ...week, days: behind }));
  }

  return { upcoming, past: past.reverse() };
}

/**
 * The first `limit` sessions of a side, still grouped by the day they fall on.
 *
 * The hub shows a digest, not the whole thread: the next few sessions and the
 * last few, with the complete Planning and History a click away. Truncating by
 * session count rather than by date keeps that digest a fixed size — a week
 * window would show five rows in a heavy block and none in a rest week, which
 * makes the page's height a function of the training rather than of its purpose.
 *
 * Days are never split: a day is either wholly in or wholly out, so the last
 * visible day never shows one of its two sessions and hides the other.
 */
export function takeThreadDays(weeks: readonly ThreadWeek[], limit: number): readonly ThreadDay[] {
  const days: ThreadDay[] = [];
  let taken = 0;

  for (const week of weeks) {
    for (const day of week.days) {
      if (taken >= limit) return days;
      days.push(day);
      taken += day.entries.length;
    }
  }

  return days;
}

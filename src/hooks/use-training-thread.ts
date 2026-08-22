'use client';

import { useMemo, useState } from 'react';
import type { ActivityType } from '@prisma/client';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { buildThread } from '@/lib/training/thread/build-thread';
import { buildLoadRuler } from '@/lib/training/thread/load-ruler';
import type { ThreadWeek } from '@/lib/training/thread/thread-model';

/**
 * The thread, assembled from the two lists the app already fetches.
 *
 * No new endpoint: `useActivities` and `usePlannedSessions` are shared caches
 * behind eight other views, and `Activity.plannedSession` already carries the
 * link this needs. Adding a "thread" route would have meant a third copy of the
 * same rows with its own staleness.
 *
 * Widening the window is therefore free — everything is in memory, so
 * "Remonter le fil" is a render, not a request.
 */

/**
 * The span the instruments always read, whatever the thread has loaded.
 *
 * The ruler and the plan chart are maps of the season, not views of the reading
 * window — a ruler that shrinks to two bars because the athlete has only paged in
 * a week has stopped being a map. Nine weeks is what the ruler draws; the chart
 * takes the last eight of them.
 */
export const THREAD_SEASON_DAYS = 9 * 7;

export type ThreadSportFilter = ActivityType | 'ALL';

export function useTrainingThread() {
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();

  const [sport, setSport] = useState<ThreadSportFilter>('ALL');

  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);
  const planned = useMemo(() => plannedQuery.data ?? [], [plannedQuery.data]);

  /* One arrangement, unfiltered, over a fixed season. Unfiltered so the sport
     pills can count what they would show; fixed so nothing on the page redraws
     itself because the reader looked at it differently. */
  const weeks = useMemo(
    () =>
      buildThread({
        activities,
        plannedSessions: planned,
        pivot: new Date(),
        daysBack: THREAD_SEASON_DAYS,
      }),
    [activities, planned],
  );

  const filtered = useMemo<ThreadWeek[]>(() => {
    if (sport === 'ALL') return weeks;
    return weeks
      .map((week) => ({
        ...week,
        days: week.days
          .map((day) => ({ ...day, entries: day.entries.filter((e) => e.type === sport) }))
          .filter((day) => day.entries.length > 0),
      }))
      .filter((week) => week.days.length > 0);
  }, [weeks, sport]);

  const counts = useMemo(() => {
    const byType = new Map<ActivityType, number>();
    let all = 0;
    for (const week of weeks) {
      for (const day of week.days) {
        for (const entry of day.entries) {
          all += 1;
          byType.set(entry.type, (byType.get(entry.type) ?? 0) + 1);
        }
      }
    }
    return { all, byType };
  }, [weeks]);

  /* Unfiltered and unpaged on purpose: a map that redraws itself when you filter,
     or when you ask to see one more week, is no longer a map. */
  const ruler = useMemo(() => buildLoadRuler(weeks), [weeks]);

  return {
    weeks: filtered,
    /** Nine weeks, fixed — for the ruler, the plan chart and adherence. */
    seasonWeeks: weeks,
    ruler,
    counts,
    sport,
    setSport,
    goals: goalsQuery.data ?? [],
    loading: isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery]),
  };
}

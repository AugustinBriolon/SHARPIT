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

/** Four weeks back reaches the last block without dragging a season into the DOM. */
export const THREAD_INITIAL_WEEKS_BACK = 4;
export const THREAD_WEEKS_STEP = 4;

export type ThreadSportFilter = ActivityType | 'ALL';

export function useTrainingThread() {
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();

  const [weeksBack, setWeeksBack] = useState(THREAD_INITIAL_WEEKS_BACK);
  const [sport, setSport] = useState<ThreadSportFilter>('ALL');

  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);
  const planned = useMemo(() => plannedQuery.data ?? [], [plannedQuery.data]);

  /* Built unfiltered so the sport pills can count what they would show, and so
     changing the filter never re-derives the arrangement underneath. */
  const weeks = useMemo(
    () => buildThread({ activities, plannedSessions: planned, pivot: new Date(), weeksBack }),
    [activities, planned, weeksBack],
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

  /* The ruler reads the unfiltered weeks on purpose: it is a map of the season,
     and a map that redraws itself when you filter is no longer a map. */
  const ruler = useMemo(() => buildLoadRuler(weeks), [weeks]);

  const oldestLoaded = weeks[0] ?? null;

  return {
    weeks: filtered,
    ruler,
    counts,
    sport,
    setSport,
    goals: goalsQuery.data ?? [],
    loading: isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery]),
    /** Everything is already cached — this widens the view, it does not fetch. */
    loadEarlier: () => setWeeksBack((current) => current + THREAD_WEEKS_STEP),
    oldestLoaded,
  };
}

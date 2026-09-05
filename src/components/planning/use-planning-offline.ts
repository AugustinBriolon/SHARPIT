'use client';

import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isSet } from '@/lib/util/value';

/**
 * Offline gate for the week.
 *
 * The week is arranged from three shared caches. Offline with all three cold
 * there is nothing to arrange, and an empty seven-day grid reads as "you planned
 * nothing" rather than "this could not be loaded" — the lie is worse than the
 * gap. So the persisted snapshot is shown instead of the skeletons.
 */
export function usePlanningOffline() {
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();

  const online = useOnlineStatus();
  const hasNoLiveContent =
    !isSet(activitiesQuery.data) && !isSet(plannedQuery.data) && !isSet(goalsQuery.data);

  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  return {
    offlineEntry,
    showOfflineSnapshot: !online && hasNoLiveContent && isSet(offlineEntry),
  };
}

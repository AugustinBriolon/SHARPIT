'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLayoutEffect } from 'react';
import {
  ensureShellAthleteRefresh,
  SHELL_REFRESH_MIN_INTERVAL_MS,
} from '@/lib/athlete-state/shell-refresh-seed';

/**
 * Silent athlete-state refresh on app open + return to foreground.
 * Starts in useLayoutEffect (not render) so Next prerender never freezes
 * `new Date()`, while still running before children's useEffect — Today can
 * join the same in-flight POST and skip a duplicate presentation GET when
 * todayPresentation is seeded.
 *
 * Visibility re-entry reuses the freshness gate (Garmin/Strava stale after
 * 30 min) so a finished session can land without a manual sync.
 */
export function AthleteStateInitializer() {
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    const refresh = (minIntervalMs?: number) => {
      const trainingDayId = format(new Date(), 'yyyy-MM-dd');
      void ensureShellAthleteRefresh(queryClient, trainingDayId, { minIntervalMs });
    };

    refresh();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      refresh(SHELL_REFRESH_MIN_INTERVAL_MS);
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [queryClient]);

  return null;
}

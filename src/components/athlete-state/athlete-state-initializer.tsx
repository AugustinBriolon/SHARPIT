'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLayoutEffect } from 'react';
import { ensureShellAthleteRefresh } from '@/lib/athlete-state/shell-refresh-seed';

/**
 * Silent athlete-state refresh on app open.
 * Starts in useLayoutEffect (not render) so Next prerender never freezes
 * `new Date()`, while still running before children's useEffect — Today can
 * join the same in-flight POST and skip a duplicate presentation GET when
 * todayPresentation is seeded.
 */
export function AthleteStateInitializer() {
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    const trainingDayId = format(new Date(), 'yyyy-MM-dd');
    void ensureShellAthleteRefresh(queryClient, trainingDayId);
  }, [queryClient]);

  return null;
}

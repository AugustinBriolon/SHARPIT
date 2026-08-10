'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRef } from 'react';
import { ensureShellAthleteRefresh } from '@/lib/athlete-state/shell-refresh-seed';

/**
 * Silent athlete-state refresh on app open.
 * Starts during first render (not useEffect) so Today can join the same in-flight
 * POST and skip a duplicate presentation GET when todayPresentation is seeded.
 */
export function AthleteStateInitializer() {
  const queryClient = useQueryClient();
  const started = useRef(false);

  if (!started.current) {
    started.current = true;
    const trainingDayId = format(new Date(), 'yyyy-MM-dd');
    void ensureShellAthleteRefresh(queryClient, trainingDayId);
  }

  return null;
}

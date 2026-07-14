'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useRef } from 'react';
import { queryKeys } from '@/lib/query/keys';

/**
 * Silent athlete-state refresh on app open.
 * Displays the persisted snapshot immediately; refreshes in background.
 */
export function AthleteStateInitializer() {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const trainingDayId = format(new Date(), 'yyyy-MM-dd');

    void (async () => {
      try {
        const res = await fetch(`/api/athlete-state/refresh?trainingDayId=${trainingDayId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'app_shell' }),
        });
        if (!res.ok) return;

        const data = (await res.json()) as {
          athleteSnapshot?: unknown;
          todayState?: unknown;
          todayPresentation?: unknown;
        };

        if (data.athleteSnapshot) {
          queryClient.setQueryData(queryKeys.athleteSnapshot(trainingDayId), {
            snapshot: data.athleteSnapshot,
            isRefreshing: false,
          });
        }
        if (data.todayState) {
          queryClient.setQueryData(queryKeys.today(trainingDayId), data.todayState);
        }
        if (data.todayPresentation) {
          queryClient.setQueryData(
            queryKeys.presentationToday(trainingDayId),
            data.todayPresentation,
          );
        }
        if (!data.athleteSnapshot) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.athleteSnapshot(trainingDayId),
          });
        }
      } catch {
        // Non-blocking — snapshot still loads via useAthleteSnapshot
      }
    })();
  }, [queryClient]);

  return null;
}

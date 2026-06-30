'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { queryKeys } from '@/lib/client/keys';

const MIN_INTERVAL_MS = 5 * 60 * 1000;

/** Sync Garmin récente au focus de l'app (polling léger, pas de webhook). */
export function GarminAutoSync() {
  const queryClient = useQueryClient();
  const lastSync = useRef(0);

  useEffect(() => {
    async function syncRecent() {
      const now = Date.now();
      if (now - lastSync.current < MIN_INTERVAL_MS) return;
      lastSync.current = now;

      try {
        const res = await fetch('/api/garmin/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: 3 }),
        });
        if (!res.ok) return;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
          queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions }),
          queryClient.invalidateQueries({ queryKey: queryKeys.health(60) }),
        ]);
      } catch {
        // Compte non connecté ou réseau — silencieux
      }
    }

    void syncRecent();
    const onFocus = () => void syncRecent();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [queryClient]);

  return null;
}

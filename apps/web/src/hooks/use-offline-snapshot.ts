'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { loadSnapshot } from '@/lib/pwa/snapshot-store';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';

export interface UseOfflineSnapshotResult {
  entry: PersistedSnapshotEntry | null;
  loading: boolean;
}

const clerkBypassEnabled =
  process.env.NEXT_PUBLIC_DEV_BYPASS_CLERK === 'true' && process.env.NODE_ENV === 'development';

/**
 * Reads the persisted offline Snapshot — only when `active` (the caller decides
 * when it's actually needed, e.g. offline with no live ViewModel), to avoid an
 * IndexedDB read on every normal, online render.
 */
function useOfflineSnapshotWithClerk(active: boolean): UseOfflineSnapshotResult {
  const { user, isSignedIn, isLoaded } = useUser();
  const [entry, setEntry] = useState<PersistedSnapshotEntry | null>(null);
  const [loading, setLoading] = useState(active);

  useEffect(() => {
    if (!active || !isLoaded || !isSignedIn || !user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void loadSnapshot({ ownerKey: user.id }).then((result) => {
      if (cancelled) {
        return;
      }
      setEntry(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [active, isLoaded, isSignedIn, user]);

  return { entry, loading };
}

function useOfflineSnapshotBypass(_active: boolean): UseOfflineSnapshotResult {
  return { entry: null, loading: false };
}

export const useOfflineSnapshot: (active: boolean) => UseOfflineSnapshotResult = clerkBypassEnabled
  ? useOfflineSnapshotBypass
  : useOfflineSnapshotWithClerk;

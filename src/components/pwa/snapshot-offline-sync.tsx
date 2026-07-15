'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAthleteSnapshot } from '@/hooks/use-athlete-snapshot';
import { saveSnapshot, clearSnapshot } from '@/lib/pwa/snapshot-store';

/**
 * Invisible, root-mounted. The single source of what gets persisted for offline
 * read-only access: the canonical AthleteSnapshot from useAthleteSnapshot(), not
 * whatever presentation ViewModel a given page happens to render. See ADR-008.
 *
 * Sign-out clears the persisted entry explicitly here; an athlete switch on the
 * same device (a different Clerk user.id signing in) is caught by the ownership
 * check in snapshot-store's loadSnapshot() at read time.
 */
export function SnapshotOfflineSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { snapshot } = useAthleteSnapshot();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      void clearSnapshot();
      return;
    }

    if (!snapshot) return;
    void saveSnapshot({ ownerKey: user.id, snapshot });
  }, [isLoaded, isSignedIn, user, snapshot]);

  return null;
}

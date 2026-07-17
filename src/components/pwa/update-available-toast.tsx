'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useServiceWorkerUpdate } from '@/hooks/use-sw-update';
import { toast } from '@/components/ui/toast';

/**
 * Never activates automatically — the athlete must tap Update. Until then, the
 * previously-installed service worker keeps serving the current session, so no
 * open form or coaching dialog is ever interrupted by a version swap.
 *
 * Surfaced as a persistent toast rather than a fixed top banner: a version
 * update is low-urgency and shouldn't claim the top of the screen or overlap
 * page content the way a `position: fixed` banner does.
 */
export function UpdateAvailableToast() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const shownRef = useRef(false);

  useEffect(() => {
    if (!updateAvailable || shownRef.current) return;
    shownRef.current = true;
    toast.info('Nouvelle version disponible', {
      description: (
        <button
          className="text-primary mt-1 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-2 hover:underline"
          type="button"
          onClick={applyUpdate}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Mettre à jour
        </button>
      ),
      timeout: 0,
    });
  }, [updateAvailable, applyUpdate]);

  return null;
}

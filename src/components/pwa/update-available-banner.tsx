'use client';

import { RefreshCw } from 'lucide-react';
import { useServiceWorkerUpdate } from '@/hooks/use-sw-update';
import { cn } from '@/lib/utils';

/**
 * Never activates automatically — the athlete must tap Update. Until then, the
 * previously-installed service worker keeps serving the current session, so no
 * open form or coaching dialog is ever interrupted by a version swap.
 */
export function UpdateAvailableBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className={cn(
        // Fixed overlay (unlike OfflineBanner) so one mount point covers both the
        // mobile and desktop shells without fighting either's h-dvh layout budget.
        'bg-primary/95 text-primary-foreground fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium',
        'safe-area-top',
      )}
    >
      <RefreshCw className="size-3.5 shrink-0" aria-hidden />
      <span>Nouvelle version disponible</span>
      <button
        className="min-h-11 rounded-full bg-white/20 px-3 py-1 font-semibold underline-offset-2 hover:bg-white/30 hover:underline"
        type="button"
        onClick={applyUpdate}
      >
        Mettre à jour
      </button>
    </div>
  );
}

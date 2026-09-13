'use client';

import { trainingDayIdForNow } from '@/lib/training/periodization/training-day';

const POLL_MS = 30_000;

/**
 * Notifies when the athlete training-day id flips (local midnight / boundary).
 * Used by useSyncExternalStore so Today does not stay pinned after mount.
 */
export function subscribeTrainingDayChange(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let last = trainingDayIdForNow();

  const tick = () => {
    const next = trainingDayIdForNow();
    if (next !== last) {
      last = next;
      onStoreChange();
    }
  };

  const intervalId = window.setInterval(tick, POLL_MS);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      tick();
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', tick);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', tick);
  };
}

export function getClientTrainingDayIdSnapshot(): string {
  return trainingDayIdForNow();
}

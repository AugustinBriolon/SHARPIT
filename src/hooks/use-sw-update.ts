'use client';

import { useEffect, useReducer, useRef } from 'react';
import {
  reduceServiceWorkerUpdateState,
  type ServiceWorkerUpdateState,
} from '@/lib/pwa/sw-update-state';

export interface UseServiceWorkerUpdateResult {
  updateAvailable: boolean;
  /** Posts SKIP_WAITING to the waiting worker and reloads once it takes control. */
  applyUpdate: () => void;
}

/**
 * Detects an already-installed, waiting service worker (see src/sw.ts —
 * skipWaiting is deliberately false) and lets the athlete confirm activation
 * explicitly. Never reloads or swaps the worker on its own.
 */
export function useServiceWorkerUpdate(): UseServiceWorkerUpdateResult {
  const [state, dispatch] = useReducer(
    reduceServiceWorkerUpdateState,
    'NONE' as ServiceWorkerUpdateState,
  );
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function onWaiting(registration: ServiceWorkerRegistration) {
      if (!registration.waiting) return;
      waitingWorkerRef.current = registration.waiting;
      dispatch({ type: 'WAITING_DETECTED' });
    }

    function watchRegistration(registration: ServiceWorkerRegistration) {
      onWaiting(registration);
      registration.addEventListener('updatefound', () => {
        const { installing } = registration;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // "installed" + an existing controller means this is an update to an
          // already-active worker, not the very first install — that's the case
          // we surface to the athlete.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            onWaiting(registration);
          }
        });
      });
    }

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) watchRegistration(registration);
    });

    function onControllerChange() {
      dispatch({ type: 'CONTROLLER_CHANGED' });
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  function applyUpdate() {
    dispatch({ type: 'UPDATE_REQUESTED' });
    waitingWorkerRef.current?.postMessage({ type: 'SKIP_WAITING' });
  }

  return { updateAvailable: state === 'AVAILABLE', applyUpdate };
}

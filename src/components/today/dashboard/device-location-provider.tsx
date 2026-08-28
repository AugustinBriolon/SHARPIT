'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  canAttemptSilentGeolocation,
  readHomeLocationEverGranted,
  readLastHomeLocationRefreshMs,
  shouldRefreshHomeLocation,
  writeHomeLocationEverGranted,
  writeLastHomeLocationRefreshMs,
} from '@/lib/geocoding/home-location-refresh';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import { beginGeolocationRequest } from '@/components/today/dashboard/use-device-location-helpers';
import type { DeviceLocationState } from '@/components/today/dashboard/use-device-location-types';

export type { DeviceLocationState } from '@/components/today/dashboard/use-device-location-types';

type DeviceLocationContextValue = {
  state: DeviceLocationState;
  ask: (opts?: { silent?: boolean; maximumAge?: number }) => void;
};

const DeviceLocationContext = createContext<DeviceLocationContextValue | null>(null);

async function queryGeolocationPermission(): Promise<PermissionState | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}

function useDeviceLocationController(): DeviceLocationContextValue {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DeviceLocationState>('idle');

  const persist = useCallback(
    async (latitude: number, longitude: number) => {
      const res = await fetch('/api/athlete-profile/home-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!res.ok) {
        throw new Error(`save failed: ${res.status}`);
      }
      writeLastHomeLocationRefreshMs(Date.now());
      writeHomeLocationEverGranted();
      await invalidateAfterAthleteProfileSave(queryClient);
    },
    [queryClient],
  );

  const ask = useCallback(
    (opts?: { silent?: boolean; maximumAge?: number }) => {
      beginGeolocationRequest(persist, setState, opts);
    },
    [persist],
  );

  const trySilentRefresh = useCallback(async () => {
    const now = Date.now();
    if (!shouldRefreshHomeLocation(readLastHomeLocationRefreshMs(), now)) {
      return;
    }

    const everGranted = readHomeLocationEverGranted();
    const permission = await queryGeolocationPermission();
    if (!everGranted && !canAttemptSilentGeolocation(permission)) {
      return;
    }
    if (permission === 'denied' || permission === 'prompt') {
      if (!everGranted) {
        return;
      }
    }

    ask({ silent: true, maximumAge: 300_000 });
  }, [ask]);

  useEffect(() => {
    void trySilentRefresh();
  }, [trySilentRefresh]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void trySilentRefresh();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [trySilentRefresh]);

  return { state, ask };
}

export function DeviceLocationProvider({ children }: { children: ReactNode }) {
  const value = useDeviceLocationController();
  return <DeviceLocationContext.Provider value={value}>{children}</DeviceLocationContext.Provider>;
}

/** Shared device location — one permission flow for the whole app session. */
export function useDeviceLocation(): DeviceLocationContextValue {
  const ctx = useContext(DeviceLocationContext);
  if (!ctx) {
    throw new Error('useDeviceLocation must be used within DeviceLocationProvider');
  }
  return ctx;
}

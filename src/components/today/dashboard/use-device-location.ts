'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readLastHomeLocationRefreshMs,
  shouldRefreshHomeLocation,
  writeLastHomeLocationRefreshMs,
  canAttemptSilentGeolocation,
} from '@/lib/geocoding/home-location-refresh';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import { beginGeolocationRequest } from '@/components/today/dashboard/use-device-location-helpers';
import type { DeviceLocationState } from '@/components/today/dashboard/use-device-location-types';

export type { DeviceLocationState } from '@/components/today/dashboard/use-device-location-types';

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

/**
 * Ask the device where we are.
 */
export function useDeviceLocation(options?: { autoRefresh?: boolean }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DeviceLocationState>('idle');
  const autoTriedRef = useRef(false);

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

  useEffect(() => {
    if (!options?.autoRefresh || autoTriedRef.current) {
      return;
    }
    autoTriedRef.current = true;

    const now = Date.now();
    if (!shouldRefreshHomeLocation(readLastHomeLocationRefreshMs(), now)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const permission = await queryGeolocationPermission();
      if (cancelled || !canAttemptSilentGeolocation(permission)) {
        return;
      }
      ask({ silent: true, maximumAge: 0 });
    })();

    return () => {
      cancelled = true;
    };
  }, [ask, options?.autoRefresh]);

  return { state, ask };
}

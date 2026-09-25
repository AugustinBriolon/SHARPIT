import type { DeviceLocationState } from '@/components/today/dashboard/use-device-location-types';

function geolocationErrorState(error: GeolocationPositionError): DeviceLocationState {
  if (error.code === error.PERMISSION_DENIED) {
    return 'denied';
  }
  if (error.code === error.TIMEOUT) {
    return 'timeout';
  }
  return 'unavailable';
}

export function geolocationSuccessHandler(
  persist: (latitude: number, longitude: number) => Promise<void>,
  setState: (state: DeviceLocationState) => void,
  silent?: boolean,
) {
  return async (position: GeolocationPosition) => {
    try {
      await persist(position.coords.latitude, position.coords.longitude);
      setState('idle');
    } catch (error) {
      console.error('[home-location] save failed', error);
      if (!silent) {
        setState('saveFailed');
      }
    }
  };
}

export function geolocationFailureHandler(
  setState: (state: DeviceLocationState) => void,
  silent?: boolean,
) {
  return (error: GeolocationPositionError) => {
    console.warn('[home-location] geolocation refused', {
      code: error.code,
      message: error.message,
    });
    if (silent) {
      return;
    }
    setState(geolocationErrorState(error));
  };
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
}

function markUnsupported(setState: (state: DeviceLocationState) => void, silent?: boolean) {
  if (!silent) {
    setState('unsupported');
  }
}

function markAsking(setState: (state: DeviceLocationState) => void, silent?: boolean) {
  if (!silent) {
    setState('asking');
  }
}

export function beginGeolocationRequest(
  persist: (latitude: number, longitude: number) => Promise<void>,
  setState: (state: DeviceLocationState) => void,
  opts?: { silent?: boolean; maximumAge?: number },
) {
  if (!isGeolocationSupported()) {
    markUnsupported(setState, opts?.silent);
    return;
  }
  markAsking(setState, opts?.silent);
  navigator.geolocation.getCurrentPosition(
    geolocationSuccessHandler(persist, setState, opts?.silent),
    geolocationFailureHandler(setState, opts?.silent),
    { timeout: 15_000, maximumAge: opts?.maximumAge ?? 60_000 },
  );
}

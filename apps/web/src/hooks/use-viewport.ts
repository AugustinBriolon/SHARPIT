'use client';

import { useSyncExternalStore } from 'react';

export type ViewportMode = 'mobile' | 'desktop';

const DESKTOP_QUERY = '(min-width: 1024px)';

/** SSR / first paint default — matches prior useState('desktop') behavior. */
const SERVER_SNAPSHOT: ViewportMode = 'desktop';

type ViewportListener = () => void;

let mediaQuery: MediaQueryList | null = null;
let currentMode: ViewportMode = SERVER_SNAPSHOT;
const listeners = new Set<ViewportListener>();

function readMode(mq: MediaQueryList): ViewportMode {
  return mq.matches ? 'desktop' : 'mobile';
}

function ensureSubscription(): MediaQueryList {
  if (mediaQuery) {
    return mediaQuery;
  }

  mediaQuery = window.matchMedia(DESKTOP_QUERY);
  currentMode = readMode(mediaQuery);

  const onChange = () => {
    if (!mediaQuery) {
      return;
    }
    currentMode = readMode(mediaQuery);
    listeners.forEach((listener) => listener());
  };

  mediaQuery.addEventListener('change', onChange);
  return mediaQuery;
}

function subscribe(onStoreChange: ViewportListener): () => void {
  ensureSubscription();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): ViewportMode {
  ensureSubscription();
  return currentMode;
}

function getServerSnapshot(): ViewportMode {
  return SERVER_SNAPSHOT;
}

export function useViewport(): ViewportMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useViewport() === 'mobile';
}

'use client';

import { useEffect, useState } from 'react';
import { resolveStandaloneMode } from '@/lib/pwa/standalone';

/** True once the app is confirmed running as an installed (standalone) PWA. */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const navigatorStandalone = (navigator as { standalone?: boolean }).standalone;

    const sync = () =>
      setStandalone(
        resolveStandaloneMode({
          matchesDisplayModeStandalone: mq.matches,
          navigatorStandalone,
        }),
      );

    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return standalone;
}

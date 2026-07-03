'use client';

import { useEffect, useState } from 'react';

export type ViewportMode = 'mobile' | 'desktop';

const DESKTOP_QUERY = '(min-width: 1024px)';

export function useViewport(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>('desktop');

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setMode(mq.matches ? 'desktop' : 'mobile');
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return mode;
}

export function useIsMobile(): boolean {
  return useViewport() === 'mobile';
}

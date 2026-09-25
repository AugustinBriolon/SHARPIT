'use client';

import { useEffect, useRef, useState } from 'react';

export function useDesktopStickyHeader() {
  const ref = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const mq = window.matchMedia('(min-width: 1024px)');
    if (!mq.matches) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setStuck(entry.intersectionRatio < 1), {
      root: null,
      threshold: [1],
      rootMargin: '-1px 0px 0px 0px',
    });
    observer.observe(el);

    const onBreakpoint = () => {
      if (!mq.matches) {
        setStuck(false);
      }
    };
    mq.addEventListener('change', onBreakpoint);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', onBreakpoint);
    };
  }, []);

  return { ref, stuck };
}

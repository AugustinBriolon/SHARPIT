'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** Rotating lines after Finaliser — marks the wizard as done, not mid-flow. */
export const BOOTSTRAP_LINES = [
  'Onboarding terminé…',
  'Ton Twin se met en place…',
  'Première lecture en cours…',
  'Bienvenue sur Today…',
] as const;

const LINE_MS = 1400;

export function useBootstrapLineCycle(onDone: () => void) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) {
      const t = window.setTimeout(onDone, 400);
      return () => window.clearTimeout(t);
    }

    if (index >= BOOTSTRAP_LINES.length - 1) {
      const t = window.setTimeout(onDone, LINE_MS);
      return () => window.clearTimeout(t);
    }

    const t = window.setTimeout(() => setIndex((i) => i + 1), LINE_MS);
    return () => window.clearTimeout(t);
  }, [index, onDone, reduce]);

  return BOOTSTRAP_LINES[Math.min(index, BOOTSTRAP_LINES.length - 1)]!;
}

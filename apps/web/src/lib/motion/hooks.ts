'use client';

import { useReducedMotion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { motionConfig } from '@/lib/motion/config';
import { motionTokens } from '@/lib/motion/tokens';

export type SafeMotionProps = {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
};

/**
 * Opacity + optional Y travel. Transforms collapse to 0 when reduced motion.
 * Prefer for enter/exit of instrument surfaces (Linear-quiet, not bounce).
 */
export function useSafeMotion(fullY: number = motionTokens.distance.md): SafeMotionProps {
  const reduce = useReducedMotion();
  const y = reduce ? 0 : fullY;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -fullY * 0.5 },
  };
}

/**
 * Runtime gate: reduced-motion always wins; low-end skips non-essential motion.
 */
export function useShouldAnimate({ essential = false }: { essential?: boolean } = {}): boolean {
  const reduce = useReducedMotion();
  const lowEnd = useSyncExternalStore(
    () => () => undefined,
    () => motionConfig.isLowEnd(),
    () => false,
  );
  if (reduce) {
    return false;
  }
  if (!essential && lowEnd) {
    return false;
  }
  return true;
}

/** Duration in seconds respecting reduced / low-end gates. */
export function useMotionDuration(token: keyof typeof motionTokens.duration = 'normal'): number {
  const reduce = useReducedMotion();
  if (reduce) {
    return motionTokens.duration.instant;
  }
  return motionTokens.duration[token];
}

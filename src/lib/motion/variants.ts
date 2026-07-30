import type { Transition, Variants } from 'motion/react';
import { motionTokens, springs } from '@/lib/motion/tokens';

/** Opacity-only fade — safest for reduced-motion fallbacks and route fades. */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Fade + slight rise. Callers must zero `y` when `useReducedMotion()` is true
 * (see `useSafeMotion` / `fadeUpTransition`).
 */
export function fadeUpVariants(y: number = motionTokens.distance.md): Variants {
  return {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: y * 0.5 },
  };
}

export const fadeTransition: Transition = {
  duration: motionTokens.duration.fast,
  ease: motionTokens.easing.smooth,
};

export const fadeUpTransition: Transition = {
  duration: motionTokens.duration.normal,
  ease: motionTokens.easing.smooth,
};

export const routeFadeTransition: Transition = {
  duration: motionTokens.duration.slow,
  ease: motionTokens.easing.smooth,
};

export const dialogTransition: Transition = {
  ...springs.gentle,
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: motionTokens.stagger.children,
      delayChildren: motionTokens.stagger.delayChildren,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: motionTokens.distance.sm },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.smooth,
    },
  },
};

/** Reduced-motion stagger item — opacity only. */
export const staggerItemReduced: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: motionTokens.duration.instant },
  },
};

/**
 * Grid 0fr → 1fr collapse (avoids animating raw height).
 * Pair with a child that has `min-h-0 overflow-hidden`.
 */
export const collapseVariants: Variants = {
  collapsed: {
    gridTemplateRows: '0fr',
    opacity: 0,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.sharp,
      opacity: { duration: motionTokens.duration.instant },
    },
  },
  expanded: {
    gridTemplateRows: '1fr',
    opacity: 1,
    transition: {
      duration: motionTokens.duration.normal,
      ease: motionTokens.easing.smooth,
      opacity: { duration: motionTokens.duration.fast },
    },
  },
};

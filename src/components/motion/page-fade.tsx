'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useShouldAnimate } from '@/lib/motion/hooks';
import { fadeVariants, routeFadeTransition } from '@/lib/motion/variants';

/**
 * Short opacity enter for App Router `template.tsx`.
 * Enter-only (PWA-safe) — exit shared-element transitions are out of scope V1.
 */
export function PageFade({ children }: { children: React.ReactNode }) {
  const animate = useShouldAnimate({ essential: true });
  const reduce = useReducedMotion();

  if (!animate || reduce) {
    return <>{children}</>;
  }

  return (
    <motion.div
      animate="visible"
      initial="hidden"
      transition={routeFadeTransition}
      variants={fadeVariants}
    >
      {children}
    </motion.div>
  );
}

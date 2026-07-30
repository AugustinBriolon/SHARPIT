'use client';

import { motion, useReducedMotion } from 'motion/react';
import { collapseVariants } from '@/lib/motion/variants';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';

type MotionExpandProps = {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  /** Accessible name for the region when open. */
  id?: string;
};

/**
 * Expand/collapse via CSS grid 0fr→1fr + opacity (DESIGN_LANGUAGE §9.3).
 * Avoids animating raw height.
 */
export function MotionExpand({ open, children, className, id }: MotionExpandProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return open ? (
      <div className={className} id={id}>
        {children}
      </div>
    ) : null;
  }

  return (
    <motion.div
      animate={open ? 'expanded' : 'collapsed'}
      aria-hidden={!open}
      className={cn('grid', className)}
      id={id}
      initial={false}
      style={{ transitionProperty: 'none' }}
      variants={collapseVariants}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </motion.div>
  );
}

/** Instant opacity swap duration for reduced-motion callers. */
export const expandReducedDuration = motionTokens.duration.instant;

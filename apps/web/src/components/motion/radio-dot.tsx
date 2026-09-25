'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SPRING_LAYOUT } from '@/lib/ease';

export function RadioDot({ layoutId, selected }: { layoutId: string; selected: boolean }) {
  const reduce = useReducedMotion();
  if (!selected) {
    return null;
  }
  return (
    <motion.span
      className="bg-primary absolute inset-1 rounded-full"
      layoutId={layoutId}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
    />
  );
}

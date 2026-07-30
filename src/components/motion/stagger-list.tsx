'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { staggerContainer, staggerItem, staggerItemReduced } from '@/lib/motion/variants';
import { useShouldAnimate } from '@/lib/motion/hooks';
import { cn } from '@/lib/utils';

type StaggerListProps = {
  children: React.ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'variants' | 'initial' | 'animate'>;

/**
 * Parent for staggered children. Pair with `StaggerItem`.
 * Skips stagger on low-end / reduced-motion (children still render).
 */
export function StaggerList({ children, className, ...rest }: StaggerListProps) {
  const animate = useShouldAnimate();

  if (!animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate="visible"
      className={cn(className)}
      initial="hidden"
      variants={staggerContainer}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'variants'>;

export function StaggerItem({ children, className, ...rest }: StaggerItemProps) {
  const animate = useShouldAnimate();
  const reduce = useReducedMotion();
  const variants = reduce ? staggerItemReduced : staggerItem;

  if (!animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={cn(className)} variants={variants} {...rest}>
      {children}
    </motion.div>
  );
}

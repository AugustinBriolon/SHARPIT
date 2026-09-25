'use client';

import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';
import { fadeTransition, fadeVariants } from '@/lib/motion/variants';
import { useShouldAnimate } from '@/lib/motion/hooks';
import { cn } from '@/lib/utils';

type FadePresenceProps = {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  /** Stable key for the entering child — required for exit animations. */
  presenceKey: string;
  mode?: 'sync' | 'wait' | 'popLayout';
} & Omit<HTMLMotionProps<'div'>, 'children' | 'animate' | 'initial' | 'exit' | 'variants'>;

/**
 * Conditional mount with enter/exit opacity. Skips motion when gated off.
 */
export function FadePresence({
  show,
  children,
  className,
  presenceKey,
  mode = 'wait',
  ...rest
}: FadePresenceProps) {
  const animate = useShouldAnimate({ essential: true });

  if (!animate) {
    return show ? (
      <div className={className} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    ) : null;
  }

  return (
    <AnimatePresence initial={false} mode={mode}>
      {show ? (
        <motion.div
          key={presenceKey}
          animate="visible"
          className={className}
          exit="exit"
          initial="hidden"
          transition={fadeTransition}
          variants={fadeVariants}
          {...rest}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  /** When false, render static (SSR-safe content already visible). */
  active?: boolean;
  /** Defaults to opacity-only; pass fadeUpVariants for a short rise. */
  variants?: HTMLMotionProps<'div'>['variants'];
} & Omit<HTMLMotionProps<'div'>, 'children' | 'animate' | 'initial' | 'variants'>;

/**
 * One-shot fade-in after mount. Opacity-only by default; safe when `active` flips true client-side.
 * Skips motion entirely under prefers-reduced-motion.
 */
export function FadeIn({
  children,
  className,
  active = true,
  variants = fadeVariants,
  ...rest
}: FadeInProps) {
  const animate = useShouldAnimate();

  if (!animate || !active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate="visible"
      className={cn(className)}
      initial="hidden"
      transition={fadeTransition}
      variants={variants}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

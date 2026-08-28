'use client';

import { motion, type HTMLMotionProps, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

function disclosureTransitionDuration(reduce: boolean, open: boolean): number {
  if (reduce) {
    return 0;
  }
  return open ? 0.22 : 0.14;
}

export interface AgentDisclosureProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'initial'> {
  open: boolean;
  openHeight?: CSSProperties['height'];
}

function disclosureAnimate(reduce: boolean, open: boolean) {
  if (reduce) {
    return { opacity: open ? 1 : 0 };
  }
  return {
    opacity: open ? 1 : 0,
    clipPath: open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
    y: open ? 0 : -4,
  };
}

function disclosureStyle(
  open: boolean,
  openHeight: CSSProperties['height'],
  style?: AgentDisclosureProps['style'],
): CSSProperties {
  return {
    ...style,
    height: open ? openHeight : 0,
    pointerEvents: open ? undefined : 'none',
    transformOrigin: 'top',
  } as CSSProperties;
}

/** Shared transform-only reveal for collapsible agent content. */
export function AgentDisclosure({
  open,
  openHeight = 'auto',
  className,
  style,
  transition,
  ...props
}: AgentDisclosureProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      {...props}
      animate={disclosureAnimate(reduce, open)}
      aria-hidden={!open}
      className={cn('overflow-hidden', className)}
      inert={!open}
      initial={false}
      style={disclosureStyle(open, openHeight, style)}
      transition={
        transition ?? {
          duration: disclosureTransitionDuration(reduce, open),
          ease: EASE_OUT,
        }
      }
    />
  );
}

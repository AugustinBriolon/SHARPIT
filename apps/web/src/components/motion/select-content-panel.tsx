'use client';

import { motion, type Variants } from 'motion/react';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  selectContentAnimate,
  selectContentGapTransition,
  selectContentNearValues,
  selectContentPanelTransition,
  selectContentRadiusTransition,
} from '@/components/motion/select-motion-helpers';

export const SELECT_LIST_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
};

type SelectContentContext = {
  open: boolean;
  reduce: boolean;
  triggerId: string;
  listId: string;
  placement: 'bottom' | 'top';
  setPlacement: (p: 'bottom' | 'top') => void;
};

export function SelectContentPanel({
  ctx,
  className,
  children,
}: {
  ctx: SelectContentContext;
  className?: string;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const { open } = ctx;

  useLayoutEffect(() => {
    const node = innerRef.current;
    if (!node) {
      return;
    }
    const measure = () => setHeight(node.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  });

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const trigger = document.getElementById(ctx.triggerId);
    const node = innerRef.current;
    if (!trigger || !node) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const panelHeight = node.offsetHeight;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    ctx.setPlacement(below < panelHeight + 16 && above > below ? 'top' : 'bottom');
  }, [ctx, open]);

  const isTop = ctx.placement === 'top';
  const { nearGap, nearRadius } = selectContentNearValues(open);
  const gapT = selectContentGapTransition(open);
  const radiusT = selectContentRadiusTransition(open);

  return (
    <motion.div
      aria-hidden={!open}
      aria-labelledby={ctx.triggerId}
      id={ctx.listId}
      inert={!open}
      initial={false}
      role="listbox"
      animate={selectContentAnimate({
        open,
        reduce: ctx.reduce,
        height,
        isTop,
        nearGap,
        nearRadius,
      })}
      className={cn(
        'border-border bg-background absolute right-0 left-0 z-20 rounded-xl border shadow-lg',
        isTop ? 'bottom-full' : 'top-full',
        className,
      )}
      style={{
        transformOrigin: isTop ? 'bottom' : 'top',
        overflow: 'hidden',
        pointerEvents: open ? 'auto' : 'none',
      }}
      transition={selectContentPanelTransition({
        open,
        reduce: ctx.reduce,
        isTop,
        gapT,
        radiusT,
      })}
    >
      <motion.div
        ref={innerRef}
        animate={open ? 'show' : 'hidden'}
        className="p-1"
        initial={false}
        variants={ctx.reduce ? undefined : SELECT_LIST_VARIANTS}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

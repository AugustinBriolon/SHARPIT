'use client';

import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  buildMorphPortalVariants,
  morphPopoverOrigin,
} from '@/components/motion/morph-popover-helpers';
import type { Align, Side } from '@/components/motion/popover-morph-types';

export function MorphPopoverPortal({
  open,
  reduce,
  side,
  align,
  radius,
  className,
  left,
  top,
  visible,
  triggerId,
  contentId,
  contentRef,
  children,
}: {
  open: boolean;
  reduce: boolean;
  side: Side;
  align: Align;
  radius: number;
  className?: string;
  left: number;
  top: number;
  visible: boolean;
  triggerId: string;
  contentId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const { wrap, clip } = buildMorphPortalVariants(reduce, side, align, radius);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={reduce ? { opacity: 1 } : 'show'}
          className="fixed z-[9999] [filter:drop-shadow(0_10px_18px_rgba(0,0,0,0.14))]"
          data-morph-popover-portal=""
          exit={reduce ? { opacity: 0 } : 'hidden'}
          initial={reduce ? { opacity: 0 } : 'hidden'}
          transition={reduce ? { duration: 0.12 } : undefined}
          variants={wrap}
          style={{
            left,
            top,
            visibility: visible ? 'visible' : 'hidden',
            transformOrigin: morphPopoverOrigin(side, align),
          }}
        >
          <motion.div
            ref={contentRef}
            aria-labelledby={triggerId}
            className={cn('border-border bg-background overflow-hidden border', className)}
            id={contentId}
            role="dialog"
            style={{ borderRadius: radius }}
            variants={clip}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

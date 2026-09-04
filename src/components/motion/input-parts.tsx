'use client';

import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { InputClassNames } from '@/components/motion/input-types';

export function InputErrorMessage({
  classNames,
  errorMessage,
  id,
  reduce,
}: {
  classNames?: InputClassNames;
  errorMessage: string;
  id: string;
  reduce: boolean | null;
}) {
  return (
    <AnimatePresence initial={false}>
      <motion.p
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        className={cn('text-destructive px-1 text-xs', classNames?.errorMessage)}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
        id={`${id}-error`}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
        role="alert"
        transition={{ duration: 0.2 }}
      >
        {errorMessage}
      </motion.p>
    </AnimatePresence>
  );
}

export function InputSuccessIcon({
  classNames,
  reduce,
}: {
  classNames?: InputClassNames;
  reduce: boolean | null;
}) {
  return (
    <motion.svg
      fill="none"
      viewBox="0 0 24 24"
      className={cn(
        'absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2 text-(--color-success)',
        classNames?.successIcon,
      )}
    >
      <motion.path
        animate={{ pathLength: 1 }}
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

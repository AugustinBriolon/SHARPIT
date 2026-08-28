'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { SPRING_PRESS } from '@/lib/ease';
import { cn } from '@/lib/utils';

export function ResponseAction({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.button
      aria-label={label}
      aria-pressed={label === 'Helpful' || label === 'Not helpful' ? active : undefined}
      title={label}
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce ? undefined : { scale: 0.9 }}
      className={cn(
        'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2',
        active && 'bg-muted text-foreground',
      )}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

'use client';

import { AnimatePresence, motion } from 'motion/react';
import { fadeTransition, fadeVariants } from '@/lib/motion/variants';
import {
  useBootstrapLineCycle,
  BOOTSTRAP_LINES,
} from '@/components/onboarding/gate/use-bootstrap-line-cycle';
import { cn } from '@/lib/utils';

export { BOOTSTRAP_LINES };

export const BOOTSTRAP_SUPPORT =
  'Tout est finalisé. SharpIt assemble ta première lecture à partir de ce que tu viens de renseigner.';

/**
 * Short theatrical beat after onboarding complete — no real work, just UX pacing
 * before Today.
 */
export function OnboardingBootstrapScreen({
  className,
  onDone,
}: {
  className?: string;
  onDone: () => void;
}) {
  const line = useBootstrapLineCycle(onDone);

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      role="status"
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center',
        className,
      )}
    >
      <div className="bg-primary/15 relative size-12 overflow-hidden rounded-full" aria-hidden>
        <div className="bg-primary absolute inset-0 animate-pulse rounded-full opacity-40" />
        <div className="border-primary/40 absolute inset-1 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none" />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          animate="visible"
          className="text-section-title text-balance"
          exit="exit"
          initial="hidden"
          transition={fadeTransition}
          variants={fadeVariants}
        >
          {line}
        </motion.p>
      </AnimatePresence>

      <p className="text-muted-foreground max-w-xs text-sm text-pretty">{BOOTSTRAP_SUPPORT}</p>
    </div>
  );
}

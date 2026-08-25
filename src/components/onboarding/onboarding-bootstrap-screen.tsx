'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { fadeTransition, fadeVariants } from '@/lib/motion/variants';
import { cn } from '@/lib/utils';

const BOOTSTRAP_LINES = [
  'Création de ton profil…',
  'Prise en compte de ton intention…',
  'Préparation de ton Twin…',
  'Ouverture de Today…',
] as const;

const LINE_MS = 1400;

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
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) {
      const t = window.setTimeout(onDone, 400);
      return () => window.clearTimeout(t);
    }

    if (index >= BOOTSTRAP_LINES.length - 1) {
      const t = window.setTimeout(onDone, LINE_MS);
      return () => window.clearTimeout(t);
    }

    const t = window.setTimeout(() => setIndex((i) => i + 1), LINE_MS);
    return () => window.clearTimeout(t);
  }, [index, onDone, reduce]);

  const line = BOOTSTRAP_LINES[Math.min(index, BOOTSTRAP_LINES.length - 1)]!;

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

      <p className="text-muted-foreground max-w-xs text-sm text-pretty">
        SharpIt assemble ta première lecture à partir de ce que tu viens de renseigner.
      </p>
    </div>
  );
}

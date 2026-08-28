'use client';

import { AnimatePresence, motion, type Variants } from 'motion/react';
import { EASE_OUT, SPRING_SWAP } from '@/lib/ease';

const CASCADE_STAGGER = 0.025;
const ROLL_BLUR = 'blur(3px)';

const CASCADE_LETTER_VARIANTS: Variants = {
  initial: { opacity: 0, y: '105%', filter: ROLL_BLUR },
  animate: (delay = 0) => ({
    opacity: 1,
    y: '0%',
    filter: 'blur(0px)',
    transition: { ...SPRING_SWAP, delay },
  }),
  exit: (delay = 0) => ({
    opacity: 0,
    y: '-105%',
    filter: ROLL_BLUR,
    transition: { duration: 0.16, ease: EASE_OUT, delay: delay * 0.5 },
  }),
};

export function ActionSwapCascadeLabel({ value, label }: { value: string; label: string }) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={`cascade-${value}`}
          animate="animate"
          className="absolute top-[0.08em] left-0 inline-block whitespace-pre"
          exit="exit"
          initial="initial"
          aria-hidden
        >
          {label.split('').map((char, i) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: position is the slot identity.
              key={i}
              className="inline-block whitespace-pre will-change-[opacity,filter,transform]"
              custom={i * CASCADE_STAGGER}
              variants={CASCADE_LETTER_VARIANTS}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </>
  );
}

export function ActionSwapCascadeMeasure({ label }: { label: string }) {
  return (
    <>
      {label.split('').map((char, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: position is the slot identity.
          key={index}
          className="inline-block whitespace-pre"
        >
          {char}
        </span>
      ))}
    </>
  );
}

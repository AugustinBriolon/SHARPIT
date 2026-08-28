'use client';

import { Check, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { EASE_OUT, SPRING_SWAP } from '@/lib/ease';

export type ButtonState = 'idle' | 'loading' | 'success' | 'error';

const CASCADE_STAGGER = 0.025;
const ROLL_BLUR = 'blur(6px)';

export const CASCADE_LETTER_VARIANTS: Variants = {
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

export const ICON_VARIANTS: Variants = {
  initial: { opacity: 0, width: 0, scale: 0.7, filter: ROLL_BLUR },
  animate: {
    opacity: 1,
    width: '1.5rem',
    scale: 1,
    filter: 'blur(0px)',
    transition: SPRING_SWAP,
  },
  exit: {
    opacity: 0,
    width: 0,
    scale: 0.7,
    filter: ROLL_BLUR,
    transition: { duration: 0.16, ease: EASE_OUT },
  },
};

export function IconSlot({ keyId, children }: { keyId: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      key={keyId}
      animate={reduce ? { opacity: 1 } : 'animate'}
      className="inline-grid shrink-0 place-items-center overflow-hidden"
      exit={reduce ? { opacity: 0 } : 'exit'}
      initial={reduce ? { opacity: 0 } : 'initial'}
      transition={reduce ? { duration: 0.15 } : undefined}
      variants={ICON_VARIANTS}
    >
      {children}
    </motion.span>
  );
}

function CascadeMeasureLabel({ label }: { label: string }) {
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

function CascadeTextLayer({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={`cascade-${value}`}
          animate="animate"
          className="absolute top-0 left-0 inline-block whitespace-pre"
          exit="exit"
          initial="initial"
          aria-hidden
        >
          {label.split('').map((char, index) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: position is the slot identity.
              key={index}
              className="inline-block whitespace-pre will-change-[opacity,filter,transform]"
              custom={index * CASCADE_STAGGER}
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

function PlainTextLayer({
  children,
  reduce,
  value,
}: {
  children: ReactNode;
  reduce: boolean;
  value: string;
}) {
  return (
    <AnimatePresence initial={false}>
      <motion.span
        key={`text-${value}`}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        className="absolute top-0 left-0 inline-block will-change-[opacity,filter,transform]"
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -14, filter: ROLL_BLUR }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: ROLL_BLUR }}
        transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

export function TextSlot({ value, children }: { value: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();
  const label = typeof children === 'string' ? children : null;
  const cascade = label !== null && !reduce;

  useLayoutEffect(() => {
    const nextWidth = measureRef.current?.offsetWidth;
    if (!nextWidth) {
      return;
    }
    setWidth((current) => (current === nextWidth ? current : nextWidth));
  });

  return (
    <motion.span
      animate={{ width }}
      className="relative inline-block overflow-hidden align-bottom whitespace-nowrap"
      initial={false}
      transition={reduce ? { duration: 0 } : SPRING_SWAP}
    >
      <span ref={measureRef} className="invisible inline-block whitespace-nowrap" aria-hidden>
        {cascade ? <CascadeMeasureLabel label={label} /> : children}
      </span>

      {cascade ? (
        <CascadeTextLayer label={label} value={value} />
      ) : (
        <PlainTextLayer reduce={!!reduce} value={value}>
          {children}
        </PlainTextLayer>
      )}
    </motion.span>
  );
}

export function LeadingStateIcon({ state }: { state: ButtonState }) {
  return (
    <AnimatePresence initial={false}>
      {state === 'loading' ? (
        <IconSlot keyId="loading-icon">
          <Loader2 className="h-4 w-4 animate-spin" />
        </IconSlot>
      ) : null}
      {state === 'success' ? (
        <IconSlot keyId="success-icon">
          <Check className="h-4 w-4" />
        </IconSlot>
      ) : null}
      {state === 'error' ? (
        <IconSlot keyId="error-icon">
          <X className="h-4 w-4" />
        </IconSlot>
      ) : null}
    </AnimatePresence>
  );
}

export function IdleStateIcon({ icon, state }: { icon: ReactNode; state: ButtonState }) {
  if (state !== 'idle' || !icon) {
    return null;
  }
  return (
    <AnimatePresence initial={false}>
      <IconSlot keyId="idle-icon">{icon}</IconSlot>
    </AnimatePresence>
  );
}

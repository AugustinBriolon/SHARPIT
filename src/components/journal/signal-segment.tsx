'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Minus, X } from 'lucide-react';
import { SPRING_LAYOUT } from '@/lib/ease';
import type { DayJournalFactorState } from '@/lib/health/day-journal';
import { cn } from '@/lib/utils';

const SIGNAL_OPTIONS = [
  {
    value: 'no' as const,
    label: 'Non',
    Icon: X,
    pill: 'bg-destructive shadow-destructive/25 shadow-sm',
    activeIcon: 'text-destructive-foreground',
  },
  {
    value: 'unset' as const,
    label: 'Neutre',
    Icon: Minus,
    pill: 'bg-muted-foreground/80 shadow-sm',
    activeIcon: 'text-background',
  },
  {
    value: 'yes' as const,
    label: 'Oui',
    Icon: Check,
    pill: 'bg-primary shadow-primary/30 shadow-sm',
    activeIcon: 'text-primary-foreground',
  },
] as const;

/**
 * Ternary signal control — sliding pill follows the click (shared layout).
 * Occasional interaction → spring glide under 300ms; press scale for feedback.
 */
export function SignalSegment({
  state,
  onChange,
  label,
}: {
  state: DayJournalFactorState;
  onChange: (next: DayJournalFactorState) => void;
  label: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const layoutId = useId();
  const groupId = useId();

  return (
    <div
      aria-label={label}
      className="bg-muted/80 relative grid grid-cols-3 gap-0.5 rounded-full p-0.5 ring-1 ring-black/5 dark:ring-white/10"
      role="radiogroup"
    >
      {SIGNAL_OPTIONS.map((option) => {
        const selected = state === option.value;
        return (
          <button
            key={option.value}
            aria-checked={selected}
            aria-labelledby={`${groupId}-${option.value}`}
            role="radio"
            type="button"
            className={cn(
              'relative z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-full',
              'transition-transform duration-150 ease-out active:scale-[0.97]',
              'motion-reduce:transition-none',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="sr-only" id={`${groupId}-${option.value}`}>
              {option.label}
            </span>
            {selected ? (
              <motion.span
                className={cn('absolute inset-0 rounded-full', option.pill)}
                layoutId={layoutId}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                aria-hidden
              />
            ) : null}
            <option.Icon
              strokeWidth={2.25}
              className={cn(
                'relative z-10 size-3.5 transition-colors duration-150 ease-out',
                selected ? option.activeIcon : 'text-muted-foreground',
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

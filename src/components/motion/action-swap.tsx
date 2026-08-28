'use client';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from 'motion/react';
import type { ReactNode } from 'react';
import {
  ActionSwapCascadeLabel,
  ActionSwapCascadeMeasure,
} from '@/components/motion/action-swap-cascade';
import { EASE_OUT, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

export { ActionSwapButton } from './action-swap-button';

export type ActionSwapItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  ariaLabel?: string;
};

export type ActionSwapButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ActionSwapButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type ActionSwapAnimation = 'blur' | 'roll' | 'cascade';

type CoreAnimation = 'blur' | 'roll';

export interface ActionSwapButtonProps extends Omit<
  HTMLMotionProps<'button'>,
  'children' | 'onChange'
> {
  items: ActionSwapItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, item: ActionSwapItem) => void;
  variant?: ActionSwapButtonVariant;
  size?: ActionSwapButtonSize;
  animation?: ActionSwapAnimation;
  iconOnly?: boolean;
  cycle?: boolean;
}

export interface ActionSwapTextProps {
  value: string;
  children: ReactNode;
  animation?: ActionSwapAnimation;
  className?: string;
}

export interface ActionSwapIconProps {
  value: string;
  children: ReactNode;
  animation?: ActionSwapAnimation;
  className?: string;
}

const BLUR_TRANSITION = { duration: 0.2, ease: 'easeInOut' } as const;
const ROLL_TRANSITION = SPRING_SWAP;
const ROLL_EXIT_TRANSITION = { duration: 0.14, ease: EASE_OUT } as const;
const SWAP_BLUR = 'blur(8px)';
const ROLL_BLUR = 'blur(3px)';

const TEXT_VARIANTS: Record<CoreAnimation, Variants> = {
  blur: {
    initial: { opacity: 0, scale: 0.94, filter: SWAP_BLUR },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: BLUR_TRANSITION,
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      filter: SWAP_BLUR,
      transition: BLUR_TRANSITION,
    },
  },
  roll: {
    initial: { opacity: 0, y: '90%', filter: ROLL_BLUR },
    animate: {
      opacity: 1,
      y: '0%',
      filter: 'blur(0px)',
      transition: ROLL_TRANSITION,
    },
    exit: {
      opacity: 0,
      y: '-90%',
      filter: ROLL_BLUR,
      transition: ROLL_EXIT_TRANSITION,
    },
  },
};

const ICON_VARIANTS: Record<CoreAnimation, Variants> = {
  blur: {
    initial: { opacity: 0, scale: 0.25, filter: SWAP_BLUR },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: BLUR_TRANSITION,
    },
    exit: {
      opacity: 0,
      scale: 0.25,
      filter: SWAP_BLUR,
      transition: BLUR_TRANSITION,
    },
  },
  roll: {
    initial: { opacity: 0, y: 12, filter: ROLL_BLUR },
    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: ROLL_TRANSITION,
    },
    exit: {
      opacity: 0,
      y: -12,
      filter: ROLL_BLUR,
      transition: ROLL_EXIT_TRANSITION,
    },
  },
};

function ActionSwapStandardText({
  value,
  children,
  coreAnimation,
  reduce,
  className,
}: {
  value: string;
  children: ReactNode;
  coreAnimation: CoreAnimation;
  reduce: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative -my-[0.08em] inline-block max-w-full py-[0.08em] align-bottom whitespace-nowrap',
        className,
      )}
      style={{
        clipPath: 'inset(0 -999px)',
        WebkitClipPath: 'inset(0 -999px)',
      }}
    >
      <span className="invisible inline-block whitespace-nowrap" aria-hidden>
        {children}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={`${coreAnimation}-${value}`}
          animate={reduce ? { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 } : 'animate'}
          className="absolute top-[0.08em] left-0 inline-block max-w-full truncate will-change-[opacity,filter,transform]"
          exit={reduce ? undefined : 'exit'}
          initial={reduce ? false : 'initial'}
          variants={TEXT_VARIANTS[coreAnimation]}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ActionSwapCascadeText({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative -my-[0.08em] inline-block max-w-full py-[0.08em] align-bottom whitespace-nowrap',
        className,
      )}
      style={{
        clipPath: 'inset(0 -999px)',
        WebkitClipPath: 'inset(0 -999px)',
      }}
    >
      <span className="invisible inline-block whitespace-nowrap" aria-hidden>
        <ActionSwapCascadeMeasure label={label} />
      </span>
      <ActionSwapCascadeLabel label={label} value={value} />
    </span>
  );
}

export function ActionSwapText({
  value,
  children,
  animation = 'blur',
  className,
}: ActionSwapTextProps) {
  const reduce = Boolean(useReducedMotion());
  const label = typeof children === 'string' ? children : null;
  const cascade = animation === 'cascade' && label !== null && !reduce;
  const coreAnimation: CoreAnimation = animation === 'cascade' ? 'roll' : animation;

  if (cascade) {
    return <ActionSwapCascadeText className={className} label={label} value={value} />;
  }

  return (
    <ActionSwapStandardText
      className={className}
      coreAnimation={coreAnimation}
      reduce={reduce}
      value={value}
    >
      {children}
    </ActionSwapStandardText>
  );
}

export function ActionSwapIcon({
  value,
  children,
  animation = 'blur',
  className,
}: ActionSwapIconProps) {
  const reduce = Boolean(useReducedMotion());
  const coreAnimation: CoreAnimation = animation === 'cascade' ? 'roll' : animation;

  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden', className)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={`${animation}-${value}`}
          animate={reduce ? { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 } : 'animate'}
          className="col-start-1 row-start-1 inline-flex items-center justify-center will-change-[opacity,filter,transform]"
          exit={reduce ? undefined : 'exit'}
          initial={reduce ? false : 'initial'}
          variants={ICON_VARIANTS[coreAnimation]}
          aria-hidden
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

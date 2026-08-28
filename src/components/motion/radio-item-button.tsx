'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SPRING_PRESS } from '@/lib/ease';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import { RadioDot } from '@/components/motion/radio-dot';

export function RadioItemButton({
  disabled,
  id,
  layoutId,
  selected,
  onSelect,
}: {
  disabled?: boolean;
  id: string;
  layoutId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      aria-checked={selected}
      data-state={selected ? 'checked' : 'unchecked'}
      disabled={disabled}
      id={id}
      role="radio"
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce || disabled ? undefined : { scale: motionTokens.scale.pressMicro }}
      className={cn(
        'relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 outline-none',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        selected ? 'border-primary' : 'border-muted-foreground/50 hover:border-muted-foreground',
      )}
      onClick={onSelect}
    >
      <RadioDot layoutId={layoutId} selected={selected} />
    </motion.button>
  );
}

'use client';

import { motion } from 'motion/react';
import type { ActionSwapAnimation, ActionSwapItem } from './action-swap';
import { ActionSwapIcon, ActionSwapText } from './action-swap';

export function ActionSwapButtonContent({
  activeItem,
  animation,
  hasIcon,
  iconOnly,
}: {
  activeItem: ActionSwapItem;
  animation: ActionSwapAnimation;
  hasIcon: boolean;
  iconOnly: boolean;
}) {
  return (
    <>
      {hasIcon ? (
        <ActionSwapIcon animation={animation} className="h-4 w-4" value={activeItem.id}>
          {activeItem.icon ?? null}
        </ActionSwapIcon>
      ) : null}
      {!iconOnly ? (
        <ActionSwapText animation={animation} value={activeItem.id}>
          {activeItem.label}
        </ActionSwapText>
      ) : null}
    </>
  );
}

export function ActionSwapMotionButton({
  accessibleLabel,
  className,
  disabled,
  reduce,
  onClick,
  rest,
  children,
}: {
  accessibleLabel?: string;
  className?: string;
  disabled?: boolean;
  reduce: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  rest: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      aria-label={accessibleLabel}
      className={className}
      disabled={disabled}
      type="button"
      whileTap={reduce || disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import {
  actionSwapAccessibleLabel,
  handleActionSwapClick,
  resolveActionSwapActiveItem,
} from '@/components/motion/action-swap-button-helpers';
import { ActionSwapButtonContent } from '@/components/motion/action-swap-button-parts';
import { SIZE_CLASS, VARIANT_CLASS } from '@/components/motion/action-swap-styles';
import { SPRING_PRESS } from '@/lib/ease';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import type { ActionSwapButtonProps } from './action-swap';

function useActionSwapButtonState(props: ActionSwapButtonProps) {
  const iconOnly = props.iconOnly ?? props.size === 'icon';
  const [internalValue, setInternalValue] = useState(props.defaultValue ?? props.items[0]?.id);
  const currentValue = props.value ?? internalValue;
  const { activeItem, nextItem } = resolveActionSwapActiveItem(props.items, currentValue);
  const hasIcon = props.items.some((item) => item.icon);

  return { iconOnly, internalValue, setInternalValue, activeItem, nextItem, hasIcon };
}

export function ActionSwapButton(props: ActionSwapButtonProps) {
  const reduce = useReducedMotion();
  const {
    value,
    onValueChange,
    variant = 'secondary',
    size = 'md',
    animation = 'blur',
    cycle = true,
    className,
    disabled,
    onClick,
    ...rest
  } = props;
  const state = useActionSwapButtonState(props);

  if (!state.activeItem) {
    return null;
  }

  return (
    <motion.button
      aria-label={actionSwapAccessibleLabel(state.activeItem, state.iconOnly)}
      disabled={disabled}
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce || disabled ? undefined : { scale: motionTokens.scale.pressSmall }}
      className={cn(
        'inline-flex items-center justify-center overflow-hidden font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      onClick={(event) =>
        handleActionSwapClick({
          event,
          disabled,
          cycle,
          nextItem: state.nextItem,
          value,
          onClick,
          onValueChange,
          setInternalValue: state.setInternalValue,
        })
      }
      {...rest}
    >
      <ActionSwapButtonContent
        activeItem={state.activeItem}
        animation={animation}
        hasIcon={state.hasIcon}
        iconOnly={state.iconOnly}
      />
    </motion.button>
  );
}

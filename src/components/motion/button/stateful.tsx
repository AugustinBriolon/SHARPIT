'use client';

import { forwardRef, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { Button, type ButtonProps } from './base';
import { IdleStateIcon, LeadingStateIcon, TextSlot, type ButtonState } from './stateful-parts';

export type { ButtonState } from './stateful-parts';

export interface StatefulButtonProps extends Omit<ButtonProps, 'children'> {
  state?: ButtonState;
  children: ReactNode;
  loadingText?: ReactNode;
  successText?: ReactNode;
  errorText?: ReactNode;
  icon?: ReactNode;
}

type StatefulButtonTextOptions = {
  state: ButtonState;
  loadingText: ReactNode;
  successText: ReactNode;
  errorText: ReactNode;
  children: ReactNode;
};

function resolveStatefulButtonText({
  state,
  loadingText,
  successText,
  errorText,
  children,
}: StatefulButtonTextOptions): ReactNode {
  if (state === 'loading') {
    return loadingText;
  }
  if (state === 'success') {
    return successText;
  }
  if (state === 'error') {
    return errorText;
  }
  return children;
}

export const StatefulButton = forwardRef<HTMLButtonElement, StatefulButtonProps>(
  function StatefulButton(
    {
      state = 'idle',
      children,
      loadingText = 'Loading',
      successText = 'Done',
      errorText = 'Try again',
      icon,
      disabled,
      ...rest
    },
    ref,
  ) {
    const isBusy = state === 'loading';
    const stateText = resolveStatefulButtonText({
      state,
      loadingText,
      successText,
      errorText,
      children,
    });
    const textKey = typeof stateText === 'string' ? `${state}-${stateText}` : state;

    return (
      <Button
        ref={ref}
        aria-busy={isBusy}
        disabled={disabled || isBusy}
        whileHover={undefined}
        {...rest}
      >
        <span
          aria-live="polite"
          className="relative inline-flex items-center justify-center overflow-hidden"
        >
          <LeadingStateIcon state={state} />
          <TextSlot value={textKey}>{stateText}</TextSlot>
          <IdleStateIcon icon={icon} state={state} />
        </span>
      </Button>
    );
  },
);

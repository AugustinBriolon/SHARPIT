'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type MotionInputControlProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  errorMessage?: string | null;
  hasError: boolean;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  success?: boolean;
  value: string;
  classNames?: { input?: string };
  onValueChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
};

export const MotionInputControl = forwardRef<HTMLInputElement, MotionInputControlProps>(
  function MotionInputControl(
    {
      id,
      errorMessage,
      hasError,
      leftIcon,
      rightSlot,
      success,
      value,
      classNames,
      disabled,
      type,
      onValueChange,
      onFocusChange,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) {
    return (
      <input
        ref={ref}
        aria-describedby={errorMessage ? `${id}-error` : undefined}
        aria-invalid={hasError || undefined}
        disabled={disabled}
        id={id}
        type={type}
        value={value}
        {...rest}
        className={cn(
          'peer text-foreground caret-foreground h-full w-full bg-transparent text-base leading-6 outline-none',
          'placeholder:text-muted-foreground/60',
          leftIcon ? 'pl-10' : 'pl-3.5',
          rightSlot || success ? 'pr-10' : 'pr-3.5',
          disabled && 'cursor-not-allowed',
          classNames?.input,
        )}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={(event) => {
          onFocusChange(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          onFocusChange(true);
          onFocus?.(event);
        }}
      />
    );
  },
);

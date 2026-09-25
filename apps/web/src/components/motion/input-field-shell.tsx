'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { InputProps } from '@/components/motion/input-types';
import { InputSuccessIcon } from '@/components/motion/input-parts';
import {
  inputFieldShellClassName,
  resolveInputFieldState,
} from '@/components/motion/input-field-shell-classes';

function InputLeftIcon({
  classNames,
  leftIcon,
}: {
  classNames?: InputProps['classNames'];
  leftIcon?: ReactNode;
}) {
  if (!leftIcon) {
    return null;
  }
  return (
    <span
      className={cn(
        'text-muted-foreground pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 items-center [&_svg]:h-4 [&_svg]:w-4',
        classNames?.leftIcon,
      )}
    >
      {leftIcon}
    </span>
  );
}

function InputRightSlot({
  classNames,
  rightSlot,
}: {
  classNames?: InputProps['classNames'];
  rightSlot?: ReactNode;
}) {
  if (!rightSlot) {
    return null;
  }
  return (
    <span
      className={cn(
        'text-muted-foreground absolute top-0 right-0 flex h-full items-center [&_button]:grid [&_button]:size-11 [&_button]:place-items-center [&_svg]:h-4 [&_svg]:w-4',
        classNames?.rightIcon,
      )}
    >
      {rightSlot}
    </span>
  );
}

export function InputFieldShell({
  children,
  classNames,
  disabled,
  fieldRef,
  focused,
  hasError,
  leftIcon,
  reduce,
  rightSlot,
  success,
}: {
  children: ReactNode;
  classNames?: InputProps['classNames'];
  disabled?: boolean;
  fieldRef: React.RefObject<HTMLDivElement | null>;
  focused: boolean;
  hasError: boolean;
  leftIcon?: ReactNode;
  reduce: boolean | null;
  rightSlot?: ReactNode;
  success?: boolean;
}) {
  const state = resolveInputFieldState(hasError, success, focused);

  return (
    <div
      ref={fieldRef}
      className={inputFieldShellClassName({ classNames, disabled, focused, hasError })}
      data-state={state}
    >
      <InputLeftIcon classNames={classNames} leftIcon={leftIcon} />
      {children}
      {success ? <InputSuccessIcon classNames={classNames} reduce={reduce} /> : null}
      {!success ? <InputRightSlot classNames={classNames} rightSlot={rightSlot} /> : null}
    </div>
  );
}

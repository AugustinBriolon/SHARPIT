import type { InputProps } from '@/components/motion/input-types';
import { cn } from '@/lib/utils';

export function resolveInputFieldState(
  hasError: boolean,
  success: boolean | undefined,
  focused: boolean,
) {
  if (hasError) {
    return 'error';
  }
  if (success) {
    return 'success';
  }
  if (focused) {
    return 'focused';
  }
  return 'idle';
}

export function inputFieldShellClassName({
  classNames,
  disabled,
  focused,
  hasError,
}: {
  classNames?: InputProps['classNames'];
  disabled?: boolean;
  focused: boolean;
  hasError: boolean;
}) {
  return cn(
    'relative h-11 overflow-hidden rounded-full border transition-colors duration-200',
    'border-border',
    focused && !hasError && 'border-foreground/40 ring-ring/40 ring-2',
    hasError && 'border-destructive ring-destructive/25 ring-2',
    disabled && 'opacity-60',
    classNames?.field,
  );
}

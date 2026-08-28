'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import { EASE_OUT, SPRING_PRESS } from '@/lib/ease';
import { cn } from '@/lib/utils';

const CHECK_PATH = 'M5 13l4 4L19 7';
const INDETERMINATE_PATH = 'M6 12h12';

function checkboxDataState(checked: boolean, indeterminate: boolean): string {
  if (checked) {
    return 'checked';
  }
  if (indeterminate) {
    return 'indeterminate';
  }
  return 'unchecked';
}

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  label?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
  /** Associates an external message (e.g. a form error) with the control. */
  'aria-describedby'?: string;
}

function CheckboxMarkPath({
  indeterminate,
  reduce,
  path,
}: {
  indeterminate?: boolean;
  reduce: boolean | null;
  path: string;
}) {
  return (
    <motion.path
      animate={{ pathLength: 1 }}
      d={path}
      initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              duration: indeterminate ? 0.2 : 0.3,
              ease: EASE_OUT,
              delay: 0.04,
            }
      }
    />
  );
}

function CheckboxMark({
  showMark,
  indeterminate,
  reduce,
  path,
}: {
  showMark: boolean;
  indeterminate?: boolean;
  reduce: boolean | null;
  path: string;
}) {
  if (!showMark) {
    return null;
  }
  return (
    <AnimatePresence initial={false}>
      <motion.svg
        key={indeterminate ? 'indeterminate' : 'checked'}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
        fill="none"
        height="12"
        initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        transition={reduce ? { duration: 0 } : { duration: 0.16, ease: EASE_OUT }}
        viewBox="0 0 24 24"
        width="12"
        aria-hidden
      >
        <title>{indeterminate ? 'Partially selected' : 'Selected'}</title>
        <CheckboxMarkPath indeterminate={indeterminate} path={path} reduce={reduce} />
      </motion.svg>
    </AnimatePresence>
  );
}

function CheckboxControl({
  id,
  showMark,
  indeterminate,
  checked,
  disabled,
  reduce,
  path,
  ariaLabel,
  ariaDescribedBy,
  onCheckedChange,
}: {
  id: string;
  showMark: boolean;
  indeterminate?: boolean;
  checked: boolean;
  disabled?: boolean;
  reduce: boolean | null;
  path: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <motion.button
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      data-state={checkboxDataState(checked, Boolean(indeterminate))}
      disabled={disabled}
      id={id}
      role="checkbox"
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-200 outline-none',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        showMark
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-muted-foreground/50 bg-background hover:border-muted-foreground',
      )}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      <CheckboxMark indeterminate={indeterminate} path={path} reduce={reduce} showMark={showMark} />
    </motion.button>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  indeterminate,
  label,
  className,
  id: idProp,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const reduce = useReducedMotion();
  const showMark = Boolean(checked || indeterminate);
  const path = indeterminate ? INDETERMINATE_PATH : CHECK_PATH;

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <CheckboxControl
        ariaDescribedBy={ariaDescribedBy}
        ariaLabel={ariaLabel}
        checked={checked}
        disabled={disabled}
        id={id}
        indeterminate={indeterminate}
        path={path}
        reduce={reduce}
        showMark={showMark}
        onCheckedChange={onCheckedChange}
      />
      {label ? (
        <span className={cn('text-foreground text-sm select-none', disabled && 'opacity-60')}>
          {label}
        </span>
      ) : null}
    </label>
  );
}

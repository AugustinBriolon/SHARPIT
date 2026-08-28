'use client';

import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

function fieldDataState(
  hasError: boolean,
  success: boolean,
  focused: boolean,
): 'error' | 'success' | 'focused' | 'idle' {
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

export type InputClassNames = {
  root?: string;
  label?: string;
  field?: string;
  input?: string;
  leftIcon?: string;
  rightIcon?: string;
  successIcon?: string;
  errorMessage?: string;
};

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange'
> {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Truthy error triggers a shake, red border and (if a string) a message. */
  error?: string | boolean;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  classNames?: InputClassNames;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    value: valueProp,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    error,
    success,
    leftIcon,
    rightIcon,
    className,
    classNames,
    disabled,
    id: idProp,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const reduce = useReducedMotion();

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? '');
  const value = controlled ? (valueProp ?? '') : internal;

  const [focused, setFocused] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);

  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;

  // Right edge shows the success check, otherwise the caller's right icon.
  const rightSlot = success ? null : rightIcon;

  // Shake the field when an error appears.
  useEffect(() => {
    if (!fieldRef.current || reduce || !hasError) {
      return;
    }
    animate(fieldRef.current, { x: [0, -6, 6, -4, 4, -2, 0] }, { duration: 0.45 });
  }, [hasError, reduce]);

  const handleChange = (next: string) => {
    if (!controlled) {
      setInternal(next);
    }
    onChange?.(next);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className, classNames?.root)}>
      {label ? (
        <label
          className={cn('text-foreground px-1 text-sm font-medium', classNames?.label)}
          htmlFor={id}
        >
          {label}
        </label>
      ) : null}

      <div
        ref={fieldRef}
        data-state={fieldDataState(hasError, Boolean(success), focused)}
        className={cn(
          'relative h-11 overflow-hidden rounded-full border transition-colors duration-200',
          'border-border',
          focused && !hasError && 'border-foreground/40 ring-ring/40 ring-2',
          hasError && 'border-destructive ring-destructive/25 ring-2',
          disabled && 'opacity-60',
          classNames?.field,
        )}
      >
        {leftIcon ? (
          <span
            className={cn(
              'text-muted-foreground pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 items-center [&_svg]:h-4 [&_svg]:w-4',
              classNames?.leftIcon,
            )}
          >
            {leftIcon}
          </span>
        ) : null}

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
          onChange={(e) => handleChange(e.target.value)}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
        />

        {success ? (
          <motion.svg
            fill="none"
            viewBox="0 0 24 24"
            className={cn(
              'absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2 text-(--color-success)',
              classNames?.successIcon,
            )}
          >
            <motion.path
              animate={{ pathLength: 1 }}
              d="M5 12.5l4.5 4.5L19 7.5"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </motion.svg>
        ) : null}
        {!success && rightSlot ? (
          <span
            className={cn(
              'text-muted-foreground absolute top-0 right-0 flex h-full items-center [&_button]:grid [&_button]:size-11 [&_button]:place-items-center [&_svg]:h-4 [&_svg]:w-4',
              classNames?.rightIcon,
            )}
          >
            {rightSlot}
          </span>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {errorMessage ? (
          <motion.p
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            className={cn('text-destructive px-1 text-xs', classNames?.errorMessage)}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
            id={`${id}-error`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }}
            role="alert"
            transition={{ duration: 0.2 }}
          >
            {errorMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

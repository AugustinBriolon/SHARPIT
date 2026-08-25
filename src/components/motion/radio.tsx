'use client';

import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SPRING_LAYOUT, SPRING_PRESS } from '@/lib/ease';
import { cn } from '@/lib/utils';

type RadioGroupContextValue = {
  value: string;
  setValue: (value: string) => void;
  layoutId: string;
};

const RadioCtx = createContext<RadioGroupContextValue | null>(null);

function useRadioGroup() {
  const ctx = useContext(RadioCtx);
  if (!ctx) {
    throw new Error('RadioGroupItem must be used inside <RadioGroup>');
  }
  return ctx;
}

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export function RadioGroup({
  value,
  defaultValue = '',
  onValueChange,
  children,
  className,
  orientation = 'vertical',
}: RadioGroupProps) {
  const [internal, setInternal] = useState(defaultValue);
  const layoutId = useId();
  const reduce = useReducedMotion();
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const setValue = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );
  const contextValue = useMemo(
    () => ({ value: current, setValue, layoutId }),
    [current, layoutId, setValue],
  );

  return (
    <MotionConfig transition={reduce ? { duration: 0 } : SPRING_LAYOUT}>
      <RadioCtx.Provider value={contextValue}>
        <div
          role="radiogroup"
          className={cn(
            'flex gap-3',
            orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
            className,
          )}
        >
          {children}
        </div>
      </RadioCtx.Provider>
    </MotionConfig>
  );
}

export interface RadioGroupItemProps {
  value: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function RadioGroupItem({
  value,
  label,
  disabled,
  className,
  id: idProp,
}: RadioGroupItemProps) {
  const { value: groupValue, setValue, layoutId } = useRadioGroup();
  const autoId = useId();
  const id = idProp ?? autoId;
  const reduce = useReducedMotion();
  const selected = groupValue === value;

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <motion.button
        aria-checked={selected}
        data-state={selected ? 'checked' : 'unchecked'}
        disabled={disabled}
        id={id}
        role="radio"
        transition={SPRING_PRESS}
        type="button"
        whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
        className={cn(
          'relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 outline-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          selected ? 'border-primary' : 'border-muted-foreground/50 hover:border-muted-foreground',
        )}
        onClick={() => !disabled && setValue(value)}
      >
        {selected ? (
          <motion.span
            className="bg-primary absolute inset-1 rounded-full"
            layoutId={layoutId}
            transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          />
        ) : null}
      </motion.button>
      {label ? (
        <span className={cn('text-foreground text-sm select-none', disabled && 'opacity-60')}>
          {label}
        </span>
      ) : null}
    </label>
  );
}

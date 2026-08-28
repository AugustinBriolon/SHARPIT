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
import { SPRING_LAYOUT } from '@/lib/ease';
import { cn } from '@/lib/utils';
import { RadioItemButton } from '@/components/motion/radio-item-button';

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
      if (!controlled) {
        setInternal(next);
      }
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
      <RadioItemButton
        disabled={disabled}
        id={id}
        layoutId={layoutId}
        selected={selected}
        onSelect={() => !disabled && setValue(value)}
      />
      {label ? (
        <span className={cn('text-foreground text-sm select-none', disabled && 'opacity-60')}>
          {label}
        </span>
      ) : null}
    </label>
  );
}

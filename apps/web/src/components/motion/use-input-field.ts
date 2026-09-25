'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import type { InputProps } from '@/components/motion/input-types';

export function useInputField({
  value: valueProp,
  defaultValue,
  onChange,
  error,
  success,
  rightIcon,
  id: idProp,
}: InputProps) {
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
  const rightSlot = success ? null : rightIcon;

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

  return {
    errorMessage,
    fieldRef,
    focused,
    handleChange,
    hasError,
    id,
    reduce,
    rightSlot,
    setFocused,
    value,
  };
}

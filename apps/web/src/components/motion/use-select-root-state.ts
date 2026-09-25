'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';

export type Placement = 'bottom' | 'top';

export interface SelectContextValue {
  value: string | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  select: (value: string) => void;
  register: (value: string, label: string) => void;
  unregister: (value: string) => void;
  labelFor: (value: string | undefined) => string | undefined;
  reduce: boolean;
  triggerId: string;
  listId: string;
  disabled: boolean;
  placement: Placement;
  setPlacement: (p: Placement) => void;
}

type SelectRootOptions = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
};

function useSelectOpenState(
  openProp: boolean | undefined,
  defaultOpen: boolean,
  onOpenChange?: (open: boolean) => void,
) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const openControlled = openProp !== undefined;
  const open = openControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!openControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [onOpenChange, openControlled],
  );

  return { open, setOpen };
}

function useSelectValueState(
  value: string | undefined,
  defaultValue: string | undefined,
  onValueChange: ((value: string) => void) | undefined,
  setOpen: (open: boolean) => void,
) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const select = useCallback(
    (next: string) => {
      if (!controlled) {
        setInternal(next);
      }
      onValueChange?.(next);
      setOpen(false);
    },
    [controlled, onValueChange, setOpen],
  );

  return { current, select };
}

function useSelectLabels() {
  const [labels, setLabels] = useState<Map<string, string>>(new Map());

  const register = useCallback((v: string, label: string) => {
    setLabels((m) => (m.get(v) === label ? m : new Map(m).set(v, label)));
  }, []);
  const unregister = useCallback((v: string) => {
    setLabels((m) => {
      if (!m.has(v)) {
        return m;
      }
      const next = new Map(m);
      next.delete(v);
      return next;
    });
  }, []);

  return { labels, register, unregister };
}

function useCloseOnOutside(
  open: boolean,
  setOpen: (open: boolean) => void,
  rootRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open, setOpen, rootRef]);
}

type ContextParts = {
  current: string | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  select: (value: string) => void;
  register: (value: string, label: string) => void;
  unregister: (value: string) => void;
  labels: Map<string, string>;
  reduce: boolean;
  baseId: string;
  disabled: boolean;
  placement: Placement;
  setPlacement: (p: Placement) => void;
};

function useSelectContextValue(parts: ContextParts): SelectContextValue {
  const {
    current,
    open,
    setOpen,
    select,
    register,
    unregister,
    labels,
    reduce,
    baseId,
    disabled,
    placement,
    setPlacement,
  } = parts;
  return useMemo(
    () => ({
      value: current,
      open,
      setOpen,
      select,
      register,
      unregister,
      labelFor: (v) => (v === undefined ? undefined : labels.get(v)),
      reduce,
      triggerId: `${baseId}-trigger`,
      listId: `${baseId}-list`,
      disabled,
      placement,
      setPlacement,
    }),
    [
      current,
      open,
      setOpen,
      select,
      register,
      unregister,
      labels,
      reduce,
      baseId,
      disabled,
      placement,
      setPlacement,
    ],
  );
}

export function useSelectRootState(options: SelectRootOptions): {
  ctx: SelectContextValue;
  rootRef: RefObject<HTMLDivElement | null>;
} {
  const {
    value,
    defaultValue,
    onValueChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    disabled = false,
  } = options;
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement>('bottom');
  const { open, setOpen } = useSelectOpenState(openProp, defaultOpen, onOpenChange);
  const { current, select } = useSelectValueState(value, defaultValue, onValueChange, setOpen);
  const { labels, register, unregister } = useSelectLabels();
  useCloseOnOutside(open, setOpen, rootRef);
  const ctx = useSelectContextValue({
    current,
    open,
    setOpen,
    select,
    register,
    unregister,
    labels,
    reduce,
    baseId,
    disabled,
    placement,
    setPlacement,
  });
  return { ctx, rootRef };
}

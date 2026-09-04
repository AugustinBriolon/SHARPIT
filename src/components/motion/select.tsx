'use client';

import { Check, ChevronDown } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SelectContentPanel } from '@/components/motion/select-content-panel';
import {
  SELECT_CHEVRON_TRANSITION,
  selectTriggerAnimate,
  selectTriggerRadiusTransition,
} from '@/components/motion/select-motion-helpers';
import { cn } from '@/lib/utils';

// Spring with bounce powers the unfold/separation; per-property timings in the
// content choreograph it (see SelectContent). Mirrors bouncy-accordion's feel.
const CHEVRON_TRANSITION = SELECT_CHEVRON_TRANSITION;

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: -6, filter: 'blur(3px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

type Placement = 'bottom' | 'top';

interface SelectContextValue {
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

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const ctx = useContext(SelectContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Select>`);
  }
  return ctx;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Controlled open state of the panel. A layout that stacks selects can hold
   * this to keep exactly one panel open — the panel is absolutely positioned
   * inside its field, so two open at once paint over each other's options.
   */
  open?: boolean;
  /** Uncontrolled initial open state. Default false. */
  defaultOpen?: boolean;
  /**
   * Fires whenever the panel opens or closes. The panel is absolutely
   * positioned inside the field, so a layout that stacks selects has to know
   * which one is open to paint it above its neighbours.
   */
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  children,
}: SelectProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internal, setInternal] = useState(defaultValue);
  const [labels, setLabels] = useState<Map<string, string>>(new Map());
  const [placement, setPlacement] = useState<Placement>('bottom');

  const controlled = value !== undefined;
  const current = controlled ? value : internal;
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

  // close on outside pointer / escape
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
  }, [open, setOpen]);

  const ctx = useMemo<SelectContextValue>(
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
    ],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <div ref={rootRef} className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps {
  className?: string;
  children: ReactNode;
}

export function SelectTrigger({ className, children }: SelectTriggerProps) {
  const ctx = useSelectContext('SelectTrigger');
  const isTop = ctx.placement === 'top';

  return (
    <motion.button
      animate={selectTriggerAnimate(isTop, ctx.open)}
      aria-controls={ctx.listId}
      aria-expanded={ctx.open}
      aria-haspopup="listbox"
      disabled={ctx.disabled}
      id={ctx.triggerId}
      initial={false}
      transition={selectTriggerRadiusTransition(isTop, ctx.open, ctx.reduce)}
      type="button"
      className={cn(
        'border-border bg-background text-foreground relative z-10 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors outline-none',
        'focus-visible:ring-foreground/20 hover:border-(--color-border-strong) focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      onClick={() => ctx.setOpen(!ctx.open)}
    >
      {children}
      <motion.span
        animate={{ rotate: ctx.open ? 180 : 0 }}
        className="text-muted-foreground"
        transition={ctx.reduce ? { duration: 0 } : CHEVRON_TRANSITION}
        aria-hidden
      >
        <ChevronDown className="h-4 w-4" />
      </motion.span>
    </motion.button>
  );
}

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  const ctx = useSelectContext('SelectValue');
  const label = ctx.labelFor(ctx.value);
  return (
    <span className={cn(label ? 'text-foreground' : 'text-muted-foreground', className)}>
      {label ?? placeholder ?? 'Select'}
    </span>
  );
}

export interface SelectContentProps {
  className?: string;
  children: ReactNode;
}

export function SelectContent({ className, children }: SelectContentProps) {
  const ctx = useSelectContext('SelectContent');
  return (
    <SelectContentPanel className={className} ctx={ctx}>
      {children}
    </SelectContentPanel>
  );
}

export interface SelectItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function SelectItem({ value, disabled = false, className, children }: SelectItemProps) {
  const ctx = useSelectContext('SelectItem');
  const selected = ctx.value === value;
  const label = typeof children === 'string' ? children : value;

  useLayoutEffect(() => {
    ctx.register(value, label);
    return () => ctx.unregister(value);
  }, [ctx.register, ctx.unregister, value, label]);

  return (
    <motion.li variants={ctx.reduce ? undefined : ITEM_VARIANTS}>
      <button
        aria-selected={selected}
        disabled={disabled}
        role="option"
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors outline-none',
          selected
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        onClick={() => ctx.select(value)}
      >
        {children}
        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
      </button>
    </motion.li>
  );
}

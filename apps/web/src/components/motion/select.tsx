'use client';

import { Check } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { NavArrowDown } from '@/components/icons/nav-arrows';
import { createContext, type ReactNode, useContext, useLayoutEffect } from 'react';
import { SelectContentPanel } from '@/components/motion/select-content-panel';
import {
  SELECT_CHEVRON_TRANSITION,
  selectTriggerAnimate,
  selectTriggerRadiusTransition,
} from '@/components/motion/select-motion-helpers';
import {
  useSelectRootState,
  type SelectContextValue,
} from '@/components/motion/use-select-root-state';
import { cn } from '@/lib/utils';

const CHEVRON_TRANSITION = SELECT_CHEVRON_TRANSITION;

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: -6, filter: 'blur(3px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

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
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  children,
}: SelectProps) {
  const { ctx, rootRef } = useSelectRootState({
    value,
    defaultValue,
    onValueChange,
    open,
    defaultOpen,
    onOpenChange,
    disabled,
  });

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
        'border-border bg-card text-foreground relative z-10 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors outline-none',
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
        <NavArrowDown className="h-4 w-4" />
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

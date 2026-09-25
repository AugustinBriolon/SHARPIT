'use client';

import { useReducedMotion } from 'motion/react';
import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePopoverPortalPosition } from '@/components/motion/popover-position';
import { cn } from '@/lib/utils';

import { resolveMorphPopoverPosition } from '@/components/motion/morph-popover-helpers';
import { MorphPopoverPortal } from '@/components/motion/morph-popover-portal';
import type { Align, Side } from '@/components/motion/popover-morph-types';

type MorphContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  triggerId: string;
  contentId: string;
  /** The element the panel measures against — see `registerTrigger`. */
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  registerTrigger: (node: HTMLElement | null) => void;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
};

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorphContext(component: string) {
  const ctx = useContext(MorphContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <MorphPopover>`);
  }
  return ctx;
}

export interface MorphPopoverProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * A popover whose panel morphs open from the trigger corner: it's laid out at
 * full size but clipped to the corner nearest the trigger, then unclips as one
 * piece. Closes on outside pointer / Escape. Controlled or uncontrolled.
 */
export function MorphPopover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: MorphPopoverProps) {
  const baseId = useId();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [setOpen, open]);

  // A trigger normally registers itself through MorphPopoverTrigger. It can't
  // when something else already clones the element — a Tooltip wrapping the
  // button, say — and an unregistered trigger leaves the panel with nothing to
  // measure against, so it renders permanently invisible. The root boxes the
  // trigger exactly (the content portals out of it), so it stands in until a
  // real trigger registers, and stands in again if that one unmounts. Both are
  // state, so a trigger arriving while the panel is open re-anchors it.
  const anchorRef = useMemo<React.MutableRefObject<HTMLElement | null>>(
    () => ({ current: trigger ?? root }),
    [root, trigger],
  );

  // The panel is a `role="dialog"` and goes inert the moment it closes, so
  // focus cannot be left sitting inside it: a dismissal hands it back to the
  // trigger, the way the ARIA dialog pattern asks. A pointer dismissal takes
  // the focus onward itself when it lands on something focusable — this only
  // catches the case where it would otherwise be stranded. When no trigger has
  // registered, the root anchor stands in only if it can actually hold focus;
  // there is nowhere better than where the keyboard already is, so leave it.
  const close = useCallback(() => {
    setOpen(false);
    const focused = document.activeElement;
    const inPanel = focused instanceof HTMLElement && contentRef.current?.contains(focused);
    if (!inPanel) {
      return;
    }
    const restore = trigger ?? (root && root.tabIndex >= 0 ? root : null);
    restore?.focus();
  }, [root, setOpen, trigger]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (root && !root.contains(target) && !contentRef.current?.contains(target)) {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open, root, close]);

  const ctx = useMemo<MorphContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      triggerId: `${baseId}-trigger`,
      contentId: `${baseId}-content`,
      triggerRef: anchorRef,
      registerTrigger: setTrigger,
      contentRef,
    }),
    [open, setOpen, toggle, baseId, anchorRef],
  );

  return (
    <MorphContext.Provider value={ctx}>
      <div ref={setRoot} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </MorphContext.Provider>
  );
}

export interface MorphPopoverTriggerProps {
  children: ReactElement;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}

/** Wraps a single element, toggling the popover on click. */
export function MorphPopoverTrigger({ children }: MorphPopoverTriggerProps) {
  const ctx = useMorphContext('MorphPopoverTrigger');
  if (!isValidElement(children)) {
    return children;
  }

  const child = children as ReactElement<Record<string, unknown>>;
  const childOnClick = child.props.onClick as ((e: unknown) => void) | undefined;
  const childRef = (child.props as { ref?: Ref<HTMLElement> }).ref;

  return cloneElement(child, {
    id: ctx.triggerId,
    ref: mergeRefs(childRef, ctx.registerTrigger),
    onClick: (e: unknown) => {
      childOnClick?.(e);
      ctx.toggle();
    },
    'aria-haspopup': 'dialog',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.contentId : undefined,
  });
}

export interface MorphPopoverContentProps {
  children: ReactNode;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  radius?: number;
  className?: string;
}

export function MorphPopoverContent({
  children,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  radius = 16,
  className,
}: MorphPopoverContentProps) {
  const ctx = useMorphContext('MorphPopoverContent');
  const reduce = useReducedMotion() ?? false;
  const [portalReady, setPortalReady] = useState(false);
  const layout = usePopoverPortalPosition(ctx.triggerRef, ctx.contentRef, portalReady && ctx.open);

  useEffect(() => setPortalReady(true), []);

  const position = resolveMorphPopoverPosition({ layout, side, align, sideOffset });

  if (!portalReady) {
    return null;
  }

  return (
    <MorphPopoverPortal
      align={align}
      className={className}
      contentId={ctx.contentId}
      contentRef={ctx.contentRef}
      left={position.left}
      open={ctx.open}
      radius={radius}
      reduce={reduce}
      side={side}
      top={position.top}
      triggerId={ctx.triggerId}
      visible={position.visible}
    >
      {children}
    </MorphPopoverPortal>
  );
}

'use client';
// beui.dev/components/agents/chat-app

import { ChevronDown } from 'lucide-react';
import { type HTMLMotionProps, motion, useReducedMotion } from 'motion/react';
import {
  cloneElement,
  type ComponentPropsWithRef,
  createContext,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useId,
  useState,
} from 'react';
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';
import { MessageSideContext } from '@/components/agents/message-context';
import {
  bubbleAlignClass,
  bubbleContentClass,
  bubbleExitAnimation,
  bubbleSurfaceClass,
  bubbleTransition,
} from '@/components/agents/message-bubble-helpers';

export type MessageBubbleVariant = 'solid' | 'soft' | 'tint' | 'outline' | 'ghost' | 'danger';
export type MessageBubbleAlign = 'start' | 'end';

interface MessageBubbleContextValue {
  align?: MessageBubbleAlign;
  animateIn: boolean;
  variant: MessageBubbleVariant;
}

const MessageBubbleContext = createContext<MessageBubbleContextValue>({
  animateIn: true,
  variant: 'soft',
});
const MessageBubbleLayoutContext = createContext<() => void>(() => {});

export interface MessageBubbleProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: MessageBubbleVariant;
  /** Defaults to the surrounding Message alignment when omitted. */
  align?: MessageBubbleAlign;
  /** Plays the bubble entrance once when this component mounts. */
  animateIn?: boolean;
  children?: ReactNode;
}

export interface MessageBubbleContentProps extends ComponentPropsWithRef<'div'> {
  /** Replaces the content element while preserving bubble styling. */
  render?: ReactElement;
}

export interface MessageBubbleGroupProps extends ComponentPropsWithRef<'div'> {
  spacing?: 'compact' | 'default';
}

export interface MessageBubbleCollapsibleProps extends ComponentPropsWithRef<'div'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapsedLines?: 2 | 3 | 4 | 5 | 6;
  moreLabel?: ReactNode;
  lessLabel?: ReactNode;
  contentClassName?: string;
  triggerClassName?: string;
  children?: ReactNode;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }
  };
}

const BUBBLE_CONTENT_REVEAL = {
  duration: 0.12,
  ease: EASE_OUT,
  delay: 0.04,
} as const;

// Sent bubbles should pop into place quickly with one restrained overshoot.
const BUBBLE_POP = {
  type: 'spring',
  stiffness: 520,
  damping: 27,
  mass: 0.52,
} as const;

export function MessageBubble({
  variant = 'soft',
  align,
  animateIn = false,
  className,
  children,
  initial,
  animate,
  exit,
  transition,
  layout,
  ...props
}: MessageBubbleProps) {
  const reduce = useReducedMotion() ?? false;
  const messageSide = useContext(MessageSideContext);
  const resolvedAlign = align ?? messageSide ?? 'start';

  return (
    <MessageBubbleContext.Provider value={{ align: resolvedAlign, animateIn, variant }}>
      <motion.div
        animate={animate}
        data-align={resolvedAlign}
        data-slot="message-bubble"
        data-variant={variant}
        exit={bubbleExitAnimation(reduce, exit)}
        initial={initial ?? false}
        layout={layout}
        transition={bubbleTransition(reduce, transition)}
        className={cn(
          'group/bubble flex w-full flex-col',
          bubbleAlignClass(resolvedAlign),
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    </MessageBubbleContext.Provider>
  );
}

function MessageBubbleSurfaceLayer({
  variant,
  align,
  animateIn,
  reduce,
  layoutVersion,
}: {
  variant: MessageBubbleVariant;
  align: MessageBubbleAlign;
  animateIn: boolean;
  reduce: boolean;
  layoutVersion: number;
}) {
  if (variant === 'ghost') {
    return null;
  }
  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      aria-hidden="true"
      className={bubbleSurfaceClass(variant, align)}
      initial={animateIn && !reduce ? { opacity: 0, scale: 0.92 } : false}
      layout={reduce ? false : 'size'}
      layoutDependency={layoutVersion}
      transition={
        reduce
          ? { duration: 0 }
          : {
              opacity: { duration: 0.12, ease: EASE_OUT },
              scale: BUBBLE_POP,
              layout: SPRING_LAYOUT,
            }
      }
    />
  );
}

function MessageBubbleContentBody({
  children,
  animateIn,
  reduce,
  notifyLayout,
}: {
  children: ReactNode;
  animateIn: boolean;
  reduce: boolean;
  notifyLayout: () => void;
}) {
  return (
    <MessageBubbleLayoutContext.Provider value={notifyLayout}>
      <motion.div
        animate={{ opacity: 1 }}
        className="relative"
        initial={animateIn ? { opacity: 0 } : false}
        transition={reduce ? { duration: 0.12, ease: EASE_OUT } : BUBBLE_CONTENT_REVEAL}
      >
        {children}
      </motion.div>
    </MessageBubbleLayoutContext.Provider>
  );
}

export function MessageBubbleContent({
  render,
  className,
  children,
  ref,
  ...props
}: MessageBubbleContentProps) {
  const reduce = useReducedMotion() ?? false;
  const { align = 'start', animateIn, variant } = useContext(MessageBubbleContext);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const notifyLayout = useCallback(() => setLayoutVersion((version) => version + 1), []);
  const interactive = render?.type === 'button' || render?.type === 'a';
  const classes = cn(bubbleContentClass(variant, interactive), className);
  const composedChildren = (
    <>
      <MessageBubbleSurfaceLayer
        align={align}
        animateIn={animateIn}
        layoutVersion={layoutVersion}
        reduce={reduce}
        variant={variant}
      />
      <MessageBubbleContentBody animateIn={animateIn} notifyLayout={notifyLayout} reduce={reduce}>
        {children}
      </MessageBubbleContentBody>
    </>
  );

  if (render) {
    const child = render as ReactElement<
      Record<string, unknown> & { className?: string; ref?: Ref<HTMLElement> }
    >;

    return cloneElement(child, {
      ...props,
      ref: mergeRefs(child.props.ref, ref as Ref<HTMLElement> | undefined),
      className: cn(classes, child.props.className),
      children: composedChildren,
      'data-slot': 'message-bubble-content',
    });
  }

  return (
    <div ref={ref} className={classes} data-slot="message-bubble-content" {...props}>
      {composedChildren}
    </div>
  );
}

export function MessageBubbleGroup({
  spacing = 'compact',
  className,
  ...props
}: MessageBubbleGroupProps) {
  return (
    <div
      className={cn('flex w-full flex-col', spacing === 'compact' ? 'gap-1.5' : 'gap-3', className)}
      data-slot="message-bubble-group"
      {...props}
    />
  );
}

const LINE_CLAMP_CLASS = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
} as const;

function useBubbleCollapsibleOpen(options: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { open, defaultOpen = false, onOpenChange } = options;
  const notifyLayout = useContext(MessageBubbleLayoutContext);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      notifyLayout();
      if (open === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [notifyLayout, onOpenChange, open],
  );

  return { currentOpen, setOpen };
}

function MessageBubbleCollapseTrigger({
  contentId,
  currentOpen,
  moreLabel,
  lessLabel,
  reduce,
  triggerClassName,
  onToggle,
}: {
  contentId: string;
  currentOpen: boolean;
  moreLabel: ReactNode;
  lessLabel: ReactNode;
  reduce: boolean;
  triggerClassName?: string;
  onToggle: () => void;
}) {
  return (
    <button
      aria-controls={contentId}
      aria-expanded={currentOpen}
      type="button"
      className={cn(
        'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring mt-2 inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2',
        triggerClassName,
      )}
      onClick={onToggle}
    >
      <span>{currentOpen ? lessLabel : moreLabel}</span>
      <motion.span
        animate={{ rotate: currentOpen ? 180 : 0 }}
        aria-hidden="true"
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
      >
        <ChevronDown className="size-3.5" />
      </motion.span>
    </button>
  );
}

function MessageBubbleCollapsibleInner({
  open,
  defaultOpen,
  onOpenChange,
  collapsedLines,
  moreLabel,
  lessLabel,
  contentClassName,
  triggerClassName,
  className,
  children,
  ...props
}: MessageBubbleCollapsibleProps) {
  const reduce = useReducedMotion() ?? false;
  const contentId = useId();
  const { currentOpen, setOpen } = useBubbleCollapsibleOpen({ open, defaultOpen, onOpenChange });
  const lines = collapsedLines ?? 4;

  return (
    <div
      className={cn('w-full', className)}
      data-slot="message-bubble-collapsible"
      data-state={currentOpen ? 'open' : 'closed'}
      {...props}
    >
      <div
        id={contentId}
        className={cn(
          'transition-[mask-image] duration-200',
          !currentOpen && LINE_CLAMP_CLASS[lines],
          !currentOpen && '[mask-image:linear-gradient(to_bottom,#000_68%,transparent_100%)]',
          contentClassName,
        )}
      >
        {children}
      </div>
      <MessageBubbleCollapseTrigger
        contentId={contentId}
        currentOpen={currentOpen}
        lessLabel={lessLabel ?? 'Show less'}
        moreLabel={moreLabel ?? 'Show more'}
        reduce={reduce}
        triggerClassName={triggerClassName}
        onToggle={() => setOpen(!currentOpen)}
      />
    </div>
  );
}

export function MessageBubbleCollapsible(props: MessageBubbleCollapsibleProps) {
  return <MessageBubbleCollapsibleInner {...props} />;
}

'use client';
// beui.dev/components/agents/chat-app

import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ActionSwapRollText } from '@/components/motion/action-swap-roll';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { TodoHeaderIcon, TodoStatusIcon } from '@/components/agents/todo-list-icons';
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

export type { TodoItemStatus } from '@/components/agents/todo-list-types';
import type { TodoItemStatus } from '@/components/agents/todo-list-types';

export interface TodoItem {
  id: string;
  title: ReactNode;
  status?: TodoItemStatus;
  progress?: number;
  detail?: ReactNode;
}

export interface TodoListProps {
  items: TodoItem[];
  title?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapseOnComplete?: boolean;
  maxHeight?: number;
  className?: string;
}

function statusLabel(status: TodoItemStatus) {
  if (status === 'in-progress') {
    return 'In progress';
  }
  if (status === 'completed') {
    return 'Completed';
  }
  if (status === 'cancelled') {
    return 'Cancelled';
  }
  return 'Pending';
}

function TodoListItemTitle({
  title,
  status,
  reduce,
}: {
  title: ReactNode;
  status: TodoItemStatus;
  reduce: boolean;
}) {
  return (
    <span
      className={cn(
        'min-w-0 flex-1 truncate text-sm leading-5',
        status === 'pending' && 'text-muted-foreground/65',
        status === 'in-progress' && 'text-foreground',
        status === 'completed' && 'text-muted-foreground/60',
        status === 'cancelled' && 'text-muted-foreground/55',
      )}
    >
      <span className="relative inline-block max-w-full">
        {title}
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-px origin-left bg-current"
          initial={false}
          transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT, delay: 0.06 }}
          animate={{
            scaleX: status === 'completed' ? 1 : 0,
            opacity: status === 'completed' ? 1 : 0,
          }}
        />
      </span>
    </span>
  );
}

function TodoListItem({ item, reduce }: { item: TodoItem; reduce: boolean }) {
  const status = item.status ?? 'pending';
  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-9 items-center gap-2.5 rounded-xl px-1.5 py-1"
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
      layout="position"
      transition={
        reduce
          ? { duration: 0 }
          : {
              opacity: { duration: 0.18, ease: EASE_OUT },
              y: SPRING_LAYOUT,
              layout: SPRING_LAYOUT,
            }
      }
    >
      <TodoStatusIcon progress={item.progress} status={status} />
      <span className="sr-only">{statusLabel(status)}: </span>
      <TodoListItemTitle reduce={reduce} status={status} title={item.title} />
      {item.detail ? (
        <span className="text-muted-foreground/55 shrink-0 text-sm">{item.detail}</span>
      ) : null}
    </motion.li>
  );
}

function useTodoListOpen(options: {
  open: boolean | undefined;
  defaultOpen: boolean;
  onOpenChange: TodoListProps['onOpenChange'];
  allComplete: boolean;
  collapseOnComplete: boolean;
}) {
  const { open, defaultOpen, onOpenChange, allComplete, collapseOnComplete } = options;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const previousComplete = useRef(false);
  const currentOpen = open ?? internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [onOpenChange, open],
  );

  useEffect(() => {
    if (previousComplete.current && !allComplete) {
      setOpen(true);
    }
    if (!previousComplete.current && allComplete && collapseOnComplete) {
      setOpen(false);
    }
    previousComplete.current = allComplete;
  }, [allComplete, collapseOnComplete, setOpen]);

  return { currentOpen, setOpen };
}

function TodoListTrigger({
  triggerId,
  contentId,
  currentOpen,
  setOpen,
  allComplete,
  completed,
  itemCount,
  title,
  reduce,
}: {
  triggerId: string;
  contentId: string;
  currentOpen: boolean;
  setOpen: (open: boolean) => void;
  allComplete: boolean;
  completed: number;
  itemCount: number;
  title: ReactNode;
  reduce: boolean;
}) {
  return (
    <button
      aria-controls={contentId}
      aria-expanded={currentOpen}
      className="group focus-visible:ring-ring flex h-11 w-full items-center gap-2.5 rounded-2xl px-3.5 text-left outline-none focus-visible:ring-2"
      id={triggerId}
      type="button"
      onClick={() => setOpen(!currentOpen)}
    >
      <TodoHeaderIcon complete={allComplete} />
      <h3 className="text-foreground/90 min-w-0 flex-1 truncate text-sm font-medium">{title}</h3>
      <span
        className={cn(
          'text-muted-foreground shrink-0 text-xs font-medium tabular-nums',
          allComplete && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        <span className="sr-only">
          {completed} of {itemCount} tasks completed
        </span>
        <span aria-hidden="true" className="inline-flex">
          <ActionSwapRollText value={String(completed)}>{completed}</ActionSwapRollText>
          <span>/</span>
          <span>{itemCount}</span>
        </span>
      </span>
      <motion.span
        animate={{ rotate: currentOpen ? 180 : 0 }}
        aria-hidden="true"
        className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
      >
        <ChevronDown className="size-3.5" />
      </motion.span>
    </button>
  );
}

function TodoListContent({
  triggerId,
  contentId,
  currentOpen,
  viewportRef,
  maxHeight,
  items,
  reduce,
}: {
  triggerId: string;
  contentId: string;
  currentOpen: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  maxHeight: number;
  items: TodoItem[];
  reduce: boolean;
}) {
  return (
    <AgentDisclosure aria-labelledby={triggerId} id={contentId} open={currentOpen} role="region">
      <div
        ref={viewportRef}
        className="scrollbar-hide overflow-y-auto px-2 pb-2"
        style={{ maxHeight }}
      >
        {items.length ? (
          <ol aria-live="polite" className="space-y-0">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((item) => (
                <TodoListItem key={item.id} item={item} reduce={reduce} />
              ))}
            </AnimatePresence>
          </ol>
        ) : (
          <p className="text-muted-foreground px-1.5 py-2 text-sm">No tasks yet</p>
        )}
      </div>
    </AgentDisclosure>
  );
}

export function TodoList({
  items,
  title = 'To-dos',
  open,
  defaultOpen = true,
  onOpenChange,
  collapseOnComplete = true,
  maxHeight = 248,
  className,
}: TodoListProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;
  const viewportRef = useRef<HTMLDivElement>(null);
  const completed = items.filter((item) => item.status === 'completed').length;
  const allComplete = items.length > 0 && completed === items.length;
  const itemCount = items.length;
  const { currentOpen, setOpen } = useTodoListOpen({
    open,
    defaultOpen,
    onOpenChange,
    allComplete,
    collapseOnComplete,
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || itemCount === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (viewport.scrollHeight <= viewport.clientHeight) {
        return;
      }
      if (typeof viewport.scrollTo === 'function') {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: reduce ? 'auto' : 'smooth',
        });
      } else {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [itemCount, reduce]);

  return (
    <section
      aria-label="Agent task list"
      className={cn('border-border/70 w-full overflow-hidden rounded-2xl border', className)}
    >
      <TodoListTrigger
        allComplete={allComplete}
        completed={completed}
        contentId={contentId}
        currentOpen={currentOpen}
        itemCount={itemCount}
        reduce={reduce}
        setOpen={setOpen}
        title={title}
        triggerId={triggerId}
      />
      <TodoListContent
        contentId={contentId}
        currentOpen={currentOpen}
        items={items}
        maxHeight={maxHeight}
        reduce={reduce}
        triggerId={triggerId}
        viewportRef={viewportRef}
      />
    </section>
  );
}

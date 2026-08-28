'use client';
// beui.dev/components/agents/chat-app

import { ChevronDown, ListTodo } from 'lucide-react';
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
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

function todoProgressTransition(status: string, progress: number | undefined, reduce: boolean) {
  if (status === 'in-progress' && progress === undefined && !reduce) {
    return { rotate: { duration: 1.1, repeat: Infinity, ease: 'linear' as const } };
  }
  if (reduce) {
    return { duration: 0 };
  }
  return SPRING_LAYOUT;
}

export type TodoItemStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

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

function TodoHeaderIcon({ complete }: { complete: boolean }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <span aria-hidden="true" className="relative grid size-6 shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        {complete ? (
          <motion.svg
            key="complete"
            animate={{ opacity: 1, scale: 1 }}
            className="absolute size-5.5 overflow-visible text-emerald-500"
            exit={{ opacity: 0 }}
            initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.72 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" fill="currentColor" r="9" />
            <motion.path
              animate={{ pathLength: 1 }}
              d="M7.5 12.25 10.5 15.25 16.75 8.75"
              fill="none"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
              transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT }}
            />
          </motion.svg>
        ) : (
          <motion.span
            key="todo"
            animate={{ opacity: 1, scale: 1 }}
            className="text-muted-foreground absolute grid place-items-center"
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72 }}
            initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
          >
            <ListTodo className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function TodoStatusIcon({ status, progress }: { status: TodoItemStatus; progress?: number }) {
  const reduce = useReducedMotion() ?? false;
  const normalizedProgress =
    progress === undefined ? 0.68 : Math.min(100, Math.max(0, progress)) / 100;

  return (
    <motion.svg
      aria-hidden="true"
      initial={false}
      viewBox="0 0 24 24"
      className={cn(
        'text-muted-foreground mx-0.5 size-5 shrink-0 overflow-visible',
        status === 'in-progress' && 'text-foreground',
        status === 'cancelled' && 'text-rose-600 dark:text-rose-400',
      )}
    >
      <motion.circle
        animate={{ fillOpacity: status === 'completed' ? 0.06 : 0 }}
        className={cn(status === 'in-progress' && 'opacity-20')}
        cx="12"
        cy="12"
        fill="currentColor"
        initial={false}
        r="9"
        stroke="currentColor"
        strokeDasharray={status === 'pending' ? '2 3' : undefined}
        strokeLinecap="round"
        strokeWidth="1.5"
        transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE_OUT }}
      />
      <motion.circle
        cx="12"
        cy="12"
        fill="none"
        initial={false}
        pathLength="1"
        r="9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        style={{ transformOrigin: '12px 12px' }}
        transition={todoProgressTransition(status, progress, reduce)}
        animate={{
          pathLength: status === 'in-progress' ? normalizedProgress : 0,
          opacity: status === 'in-progress' ? 1 : 0,
          rotate: status === 'in-progress' && progress === undefined && !reduce ? 360 : -90,
        }}
      />
      <motion.path
        d="M7.5 12.25 10.5 15.25 16.75 8.75"
        fill="none"
        initial={false}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT }}
        animate={{
          pathLength: status === 'completed' ? 1 : 0,
          opacity: status === 'completed' ? 1 : 0,
        }}
      />
      <motion.path
        d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5"
        fill="none"
        initial={false}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }}
        animate={{
          pathLength: status === 'cancelled' ? 1 : 0,
          opacity: status === 'cancelled' ? 1 : 0,
        }}
      />
    </motion.svg>
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
  const previousComplete = useRef(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;
  const completed = items.filter((item) => item.status === 'completed').length;
  const allComplete = items.length > 0 && completed === items.length;
  const itemCount = items.length;

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
            {completed} of {items.length} tasks completed
          </span>
          <span aria-hidden="true" className="inline-flex">
            <ActionSwapRollText value={String(completed)}>{completed}</ActionSwapRollText>
            <span>/</span>
            <span>{items.length}</span>
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

      <AgentDisclosure aria-labelledby={triggerId} id={contentId} open={currentOpen} role="region">
        <div
          ref={viewportRef}
          className="scrollbar-hide overflow-y-auto px-2 pb-2"
          style={{ maxHeight }}
        >
          {items.length ? (
            <ol aria-live="polite" className="space-y-0">
              <AnimatePresence initial={false} mode="popLayout">
                {items.map((item) => {
                  const status = item.status ?? 'pending';
                  return (
                    <motion.li
                      key={item.id}
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
                          {item.title}
                          <motion.span
                            aria-hidden="true"
                            className="absolute inset-x-0 top-1/2 h-px origin-left bg-current"
                            initial={false}
                            animate={{
                              scaleX: status === 'completed' ? 1 : 0,
                              opacity: status === 'completed' ? 1 : 0,
                            }}
                            transition={
                              reduce
                                ? { duration: 0 }
                                : { duration: 0.28, ease: EASE_OUT, delay: 0.06 }
                            }
                          />
                        </span>
                      </span>
                      {item.detail ? (
                        <span className="text-muted-foreground/55 shrink-0 text-sm">
                          {item.detail}
                        </span>
                      ) : null}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          ) : (
            <p className="text-muted-foreground px-1.5 py-2 text-sm">No tasks yet</p>
          )}
        </div>
      </AgentDisclosure>
    </section>
  );
}

'use client';

import { ListTodo } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';
import type { TodoItemStatus } from '@/components/agents/todo-list-types';

function todoProgressTransition(status: string, progress: number | undefined, reduce: boolean) {
  if (status === 'in-progress' && progress === undefined && !reduce) {
    return { rotate: { duration: 1.1, repeat: Infinity, ease: 'linear' as const } };
  }
  if (reduce) {
    return { duration: 0 };
  }
  return SPRING_LAYOUT;
}

function TodoHeaderCompleteSvg({ reduce }: { reduce: boolean }) {
  return (
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
  );
}

function TodoHeaderPendingGlyph({ reduce }: { reduce: boolean }) {
  return (
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
  );
}

export function TodoHeaderIcon({ complete }: { complete: boolean }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <span aria-hidden="true" className="relative grid size-6 shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        {complete ? (
          <TodoHeaderCompleteSvg reduce={reduce} />
        ) : (
          <TodoHeaderPendingGlyph reduce={reduce} />
        )}
      </AnimatePresence>
    </span>
  );
}

function TodoStatusBackgroundCircle({
  status,
  reduce,
}: {
  status: TodoItemStatus;
  reduce: boolean;
}) {
  return (
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
  );
}

function inProgressRotation(status: TodoItemStatus, progress: number | undefined, reduce: boolean) {
  if (status !== 'in-progress' || progress !== undefined || reduce) {
    return -90;
  }
  return 360;
}

function TodoStatusProgressCircle({
  status,
  progress,
  reduce,
}: {
  status: TodoItemStatus;
  progress?: number;
  reduce: boolean;
}) {
  const normalizedProgress =
    progress === undefined ? 0.68 : Math.min(100, Math.max(0, progress)) / 100;

  return (
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
        rotate: inProgressRotation(status, progress, reduce),
      }}
    />
  );
}

function TodoStatusMarks({ status, reduce }: { status: TodoItemStatus; reduce: boolean }) {
  return (
    <>
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
    </>
  );
}

export function TodoStatusIcon({
  status,
  progress,
}: {
  status: TodoItemStatus;
  progress?: number;
}) {
  const reduce = useReducedMotion() ?? false;

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
      <TodoStatusBackgroundCircle reduce={reduce} status={status} />
      <TodoStatusProgressCircle progress={progress} reduce={reduce} status={status} />
      <TodoStatusMarks reduce={reduce} status={status} />
    </motion.svg>
  );
}

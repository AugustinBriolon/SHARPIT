'use client';

import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode } from 'react';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { EASE_OUT, SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';
import {
  approvalStatusIcon,
  getStatusBadgeClass,
  getStatusCopy,
} from '@/components/agents/tool-approval-status';
import type { ToolApprovalParameter, ToolApprovalStatus } from './tool-approval';

export function ToolApprovalHeader({
  busy,
  description,
  detailsId,
  error,
  currentOpen,
  parameters,
  reduce,
  setOpen,
  status,
  title,
  tool,
}: {
  busy: boolean;
  description?: ReactNode;
  detailsId: string;
  error: boolean;
  currentOpen: boolean;
  parameters: ToolApprovalParameter[];
  reduce: boolean;
  setOpen: (open: boolean) => void;
  status: ToolApprovalStatus;
  title: ReactNode;
  tool: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span
        aria-hidden="true"
        className={cn(
          'border-border/60 bg-background text-muted-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border',
          error && 'text-destructive',
        )}
      >
        {approvalStatusIcon(busy, error, status, reduce)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-foreground font-medium">{title}</div>
            <div className="text-muted-foreground mt-0.5 truncate font-mono text-xs">{tool}</div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
              getStatusBadgeClass(status),
            )}
          >
            {getStatusCopy(status)}
          </span>
        </div>
        {description ? <p className="text-muted-foreground mt-2 leading-5">{description}</p> : null}

        {parameters.length ? (
          <button
            aria-controls={detailsId}
            aria-expanded={currentOpen}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-2 inline-flex items-center gap-1 rounded-md text-xs font-medium transition-colors outline-none focus-visible:ring-2"
            type="button"
            onClick={() => setOpen(!currentOpen)}
          >
            View details
            <motion.span
              animate={{ rotate: currentOpen ? 180 : 0 }}
              aria-hidden="true"
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
            >
              <ChevronDown className="size-3.5" />
            </motion.span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ToolApprovalParameters({
  detailsId,
  currentOpen,
  parameters,
}: {
  detailsId: string;
  currentOpen: boolean;
  parameters: ToolApprovalParameter[];
}) {
  if (!parameters.length) {
    return null;
  }

  return (
    <AgentDisclosure id={detailsId} open={currentOpen}>
      <dl className="border-border/50 bg-background/70 mx-4 mb-4 grid gap-2 rounded-xl border p-3">
        {parameters.map((parameter) => (
          <div
            key={parameter.id}
            className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-3 text-xs"
          >
            <dt className="text-muted-foreground">{parameter.label}</dt>
            <dd className="text-foreground/85 min-w-0 font-mono break-words">{parameter.value}</dd>
          </div>
        ))}
      </dl>
    </AgentDisclosure>
  );
}

export function ToolApprovalPendingActions({
  onAlwaysAllow,
  onApprove,
  onDeny,
  pending,
}: {
  onAlwaysAllow?: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
  pending: boolean;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <AnimatePresence initial={false}>
      {pending ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="border-border/60 flex flex-wrap items-center gap-2 border-t px-4 py-3"
          exit={{ opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
          transition={{ duration: reduce ? 0.12 : 0.22, ease: EASE_OUT }}
        >
          <motion.button
            className="bg-foreground text-background focus-visible:ring-ring rounded-xl px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            transition={SPRING_PRESS}
            type="button"
            whileTap={reduce ? undefined : { scale: 0.97 }}
            onClick={onApprove}
          >
            Allow once
          </motion.button>
          {onAlwaysAllow ? (
            <motion.button
              className="border-border/60 bg-background text-foreground hover:bg-muted focus-visible:ring-ring rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2"
              transition={SPRING_PRESS}
              type="button"
              whileTap={reduce ? undefined : { scale: 0.97 }}
              onClick={onAlwaysAllow}
            >
              Always allow
            </motion.button>
          ) : null}
          <button
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded-xl px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2"
            type="button"
            onClick={onDeny}
          >
            Deny
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

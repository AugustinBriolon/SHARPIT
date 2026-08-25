'use client';
// beui.dev/components/agents/chat-app

import { Check, ChevronDown, CircleAlert, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { AgentCode, type AgentCodeLanguage } from '@/components/agents/agent-code';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { EASE_OUT, SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

function approvalStatusIcon(
  busy: boolean,
  error: boolean,
  status: ToolApprovalStatus,
  reduce: boolean,
) {
  if (busy) {
    return <LoaderCircle className={cn('size-4', !reduce && 'animate-spin')} />;
  }
  if (error) return <CircleAlert className="size-4" />;
  if (status === 'denied') return <X className="size-4" />;
  if (status === 'approved' || status === 'complete') return <Check className="size-4" />;
  return <ShieldCheck className="size-4" />;
}

export type ToolApprovalStatus =
  'pending' | 'approving' | 'approved' | 'denied' | 'running' | 'complete' | 'error';

export interface ToolApprovalParameter {
  id: string;
  label: ReactNode;
  value: ReactNode;
}

export interface ToolApprovalCodeProps {
  code: string;
  language?: AgentCodeLanguage;
  className?: string;
}

export interface ToolApprovalProps {
  tool: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  parameters?: ToolApprovalParameter[];
  status?: ToolApprovalStatus;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApprove?: () => void;
  onAlwaysAllow?: () => void;
  onDeny?: () => void;
  className?: string;
}

function getStatusCopy(status: ToolApprovalStatus) {
  if (status === 'approving') return 'Approving';
  if (status === 'approved') return 'Approved';
  if (status === 'denied') return 'Denied';
  if (status === 'running') return 'Running';
  if (status === 'complete') return 'Completed';
  if (status === 'error') return 'Failed';
  return 'Approval required';
}

function getStatusBadgeClass(status: ToolApprovalStatus) {
  if (status === 'pending') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  if (status === 'approving' || status === 'running') {
    return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400';
  }
  if (status === 'approved' || status === 'complete') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400';
}

export function ToolApprovalCode({ code, language = 'bash', className }: ToolApprovalCodeProps) {
  return (
    <AgentCode
      code={code}
      language={language}
      className={cn(
        // Parameter values sit in a narrow grid column with nowhere to scroll
        // on touch, so they wrap instead of clipping (as ToolResultOutput does).
        'border-border/50 bg-muted/30 rounded-lg border px-2.5 py-2 break-words whitespace-pre-wrap',
        className,
      )}
    />
  );
}

export function ToolApproval({
  tool,
  title = 'Allow this tool to run?',
  description,
  parameters = [],
  status = 'pending',
  open,
  defaultOpen = false,
  onOpenChange,
  onApprove,
  onAlwaysAllow,
  onDeny,
  className,
}: ToolApprovalProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const detailsId = `${baseId}-details`;
  const previousStatus = useRef(status);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, open],
  );
  const busy = status === 'approving' || status === 'running';
  const pending = status === 'pending';
  const error = status === 'error';

  useEffect(() => {
    if (previousStatus.current === 'pending' && status !== 'pending') {
      setOpen(false);
    }
    previousStatus.current = status;
  }, [setOpen, status]);

  return (
    <div
      aria-busy={busy}
      data-state={status}
      className={cn(
        'border-border/60 bg-muted/20 w-full overflow-hidden rounded-2xl border text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          aria-hidden="true"
          className={cn(
            'border-border/60 bg-background text-muted-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border',
            error && 'text-destructive',
          )}
        >
          {approvalStatusIcon(busy, Boolean(error), status, reduce)}
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
          {description ? (
            <p className="text-muted-foreground mt-2 leading-5">{description}</p>
          ) : null}

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

      <AgentDisclosure id={detailsId} open={currentOpen}>
        <dl className="border-border/50 bg-background/70 mx-4 mb-4 grid gap-2 rounded-xl border p-3">
          {parameters.map((parameter) => (
            <div
              key={parameter.id}
              className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-3 text-xs"
            >
              <dt className="text-muted-foreground">{parameter.label}</dt>
              <dd className="text-foreground/85 min-w-0 font-mono break-words">
                {parameter.value}
              </dd>
            </div>
          ))}
        </dl>
      </AgentDisclosure>

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
    </div>
  );
}

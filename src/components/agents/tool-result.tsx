'use client';
// beui.dev/components/agents/chat-app

import {
  Ban,
  Braces,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Copy,
  LoaderCircle,
  RotateCcw,
  SquareTerminal,
  Wrench,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AgentCode, type AgentCodeLanguage } from '@/components/agents/agent-code';
import { ActionSwapRollText } from '@/components/motion/action-swap-roll';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

export type ToolResultStatus = 'running' | 'success' | 'error' | 'cancelled';
export type ToolResultKind = 'terminal' | 'request' | 'custom';

export interface ToolResultProps {
  tool: ReactNode;
  title: ReactNode;
  children: ReactNode;
  status?: ToolResultStatus;
  kind?: ToolResultKind;
  meta?: ReactNode;
  icon?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapseOnComplete?: boolean;
  maxHeight?: number;
  copyText?: string;
  onCopy?: () => void | Promise<void>;
  onRetry?: () => void;
  className?: string;
  contentClassName?: string;
}

export interface ToolResultOutputProps {
  children: string;
  language?: AgentCodeLanguage;
  className?: string;
}

function getStatusLabel(status: ToolResultStatus) {
  if (status === 'running') {
    return 'Running';
  }
  if (status === 'success') {
    return 'Completed';
  }
  if (status === 'error') {
    return 'Failed';
  }
  return 'Cancelled';
}

function getSwapKey(value: ReactNode, fallback: string) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function getStatusClass(status: ToolResultStatus) {
  if (status === 'running') {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (status === 'success') {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (status === 'error') {
    return 'text-rose-600 dark:text-rose-400';
  }
  return 'text-muted-foreground';
}

function KindIcon({ kind }: { kind: ToolResultKind }) {
  if (kind === 'terminal') {
    return <SquareTerminal className="size-4" />;
  }
  if (kind === 'request') {
    return <Braces className="size-4" />;
  }
  return <Wrench className="size-4" />;
}

function StatusIcon({ status, reduce }: { status: ToolResultStatus; reduce: boolean }) {
  if (status === 'running') {
    return <LoaderCircle className={cn('size-3', !reduce && 'animate-spin')} />;
  }
  if (status === 'success') {
    return <CircleCheck className="size-3" />;
  }
  if (status === 'error') {
    return <CircleX className="size-3" />;
  }
  return <Ban className="size-3" />;
}

function ToolResultAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.button
      aria-label={label}
      className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2"
      title={label}
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce ? undefined : { scale: 0.9 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function ToolResultOutput({
  children,
  language = 'bash',
  className,
}: ToolResultOutputProps) {
  return (
    <AgentCode
      className={cn('text-foreground/80 break-words whitespace-pre-wrap', className)}
      code={children}
      language={language}
    />
  );
}

export function ToolResult({
  tool,
  title,
  children,
  status = 'running',
  kind = 'custom',
  meta,
  icon,
  open,
  defaultOpen = true,
  onOpenChange,
  collapseOnComplete = true,
  maxHeight = 220,
  copyText,
  onCopy,
  onRetry,
  className,
  contentClassName,
}: ToolResultProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousStatus = useRef(status);
  const copyTimer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;
  const running = status === 'running';
  const canCopy = Boolean(copyText || onCopy);
  const titleKey = getSwapKey(title, status);
  const metaKey = getSwapKey(meta, `${status}-meta`);
  const toolKey = getSwapKey(tool, `${status}-tool`);
  const statusLabel = getStatusLabel(status);

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
    if (previousStatus.current !== 'running' && status === 'running') {
      setOpen(true);
    }
    if (previousStatus.current === 'running' && status !== 'running' && collapseOnComplete) {
      setOpen(false);
    }
    previousStatus.current = status;
  }, [collapseOnComplete, setOpen, status]);

  useEffect(
    () => () => {
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !currentOpen || !running) {
      return;
    }

    const frame = requestAnimationFrame(() => {
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
  });

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      await onCopy();
    } else if (copyText) {
      await navigator.clipboard?.writeText(copyText);
    }

    setCopied(true);
    if (copyTimer.current) {
      window.clearTimeout(copyTimer.current);
    }
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [copyText, onCopy]);

  return (
    <div aria-busy={running} className={cn('w-full text-sm', className)} data-state={status}>
      <button
        aria-controls={contentId}
        aria-expanded={currentOpen}
        className="group focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-9 w-full items-center gap-2 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        id={triggerId}
        type="button"
        onClick={() => setOpen(!currentOpen)}
      >
        <span
          aria-hidden="true"
          className="text-muted-foreground grid size-4 shrink-0 place-items-center"
        >
          {icon ?? <KindIcon kind={kind} />}
        </span>
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="text-foreground/90 min-w-0 truncate font-medium">
            <ActionSwapRollText value={titleKey}>{title}</ActionSwapRollText>
          </span>
          {meta ? (
            <span className="text-muted-foreground/60 shrink-0 text-xs">
              <ActionSwapRollText value={metaKey}>{meta}</ActionSwapRollText>
            </span>
          ) : null}
          <span className="text-muted-foreground/55 min-w-0 truncate font-mono text-[11px]">
            <ActionSwapRollText value={toolKey}>{tool}</ActionSwapRollText>
          </span>
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 text-[11px] font-medium',
            getStatusClass(status),
          )}
        >
          <StatusIcon reduce={reduce} status={status} />
          <ActionSwapRollText value={status}>{statusLabel}</ActionSwapRollText>
        </span>
        <motion.span
          animate={{ rotate: currentOpen ? 180 : 0 }}
          aria-hidden="true"
          className="text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors"
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>

      <AgentDisclosure aria-labelledby={triggerId} id={contentId} open={currentOpen} role="region">
        <div className="pt-1.5 pl-6">
          <div className="bg-muted/80 overflow-hidden rounded-xl">
            <div
              ref={viewportRef}
              aria-live="polite"
              className="scrollbar-hide overflow-y-auto"
              role="log"
              style={{ maxHeight }}
            >
              <div className={cn('p-3', contentClassName)}>{children}</div>
            </div>

            {canCopy || onRetry ? (
              <div className="flex items-center gap-0.5 px-2 pb-1.5">
                {canCopy ? (
                  <ToolResultAction label={copied ? 'Copied' : 'Copy result'} onClick={handleCopy}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </ToolResultAction>
                ) : null}
                {onRetry ? (
                  <ToolResultAction label="Run again" onClick={onRetry}>
                    <RotateCcw className="size-3.5" />
                  </ToolResultAction>
                ) : null}
                <span className="text-muted-foreground/55 ml-auto text-[11px]">
                  <ActionSwapRollText value={status}>{statusLabel}</ActionSwapRollText>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </AgentDisclosure>
    </div>
  );
}

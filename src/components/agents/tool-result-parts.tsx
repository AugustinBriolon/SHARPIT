'use client';

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
import { type ReactNode } from 'react';
import { ActionSwapRollText } from '@/components/motion/action-swap-roll';
import { SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import {
  getStatusClass,
  getStatusLabel,
  getSwapKey,
} from '@/components/agents/tool-result-helpers';
import type { ToolResultKind, ToolResultStatus } from './tool-result';

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

export function ToolResultAction({
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
      whileTap={reduce ? undefined : { scale: motionTokens.scale.pressMicro }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function ToolResultTrigger({
  contentId,
  currentOpen,
  icon,
  kind,
  meta,
  reduce,
  setOpen,
  status,
  title,
  tool,
  triggerId,
}: {
  contentId: string;
  currentOpen: boolean;
  icon?: ReactNode;
  kind: ToolResultKind;
  meta?: ReactNode;
  reduce: boolean;
  setOpen: (open: boolean) => void;
  status: ToolResultStatus;
  title: ReactNode;
  tool: ReactNode;
  triggerId: string;
}) {
  const titleKey = getSwapKey(title, status);
  const metaKey = getSwapKey(meta, `${status}-meta`);
  const toolKey = getSwapKey(tool, `${status}-tool`);
  const statusLabel = getStatusLabel(status);

  return (
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
  );
}

export function ToolResultFooter({
  canCopy,
  copied,
  handleCopy,
  onRetry,
  status,
}: {
  canCopy: boolean;
  copied: boolean;
  handleCopy: () => void;
  onRetry?: () => void;
  status: ToolResultStatus;
}) {
  if (!canCopy && !onRetry) {
    return null;
  }

  const statusLabel = getStatusLabel(status);

  return (
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
  );
}

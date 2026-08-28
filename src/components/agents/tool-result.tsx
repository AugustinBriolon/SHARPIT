'use client';
// beui.dev/components/agents/chat-app

import { useId, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { AgentCode, type AgentCodeLanguage } from '@/components/agents/agent-code';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { ToolResultFooter, ToolResultTrigger } from '@/components/agents/tool-result-parts';
import {
  useToolResultAutoScroll,
  useToolResultCopy,
  useToolResultOpen,
} from '@/components/agents/use-tool-result';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

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
  const { currentOpen, setOpen } = useToolResultOpen({
    open,
    defaultOpen,
    onOpenChange,
    status,
    collapseOnComplete,
  });
  const { copied, handleCopy } = useToolResultCopy({ copyText, onCopy });
  const running = status === 'running';
  const canCopy = Boolean(copyText || onCopy);

  useToolResultAutoScroll(viewportRef, currentOpen, running, reduce);

  return (
    <div aria-busy={running} className={cn('w-full text-sm', className)} data-state={status}>
      <ToolResultTrigger
        contentId={contentId}
        currentOpen={currentOpen}
        icon={icon}
        kind={kind}
        meta={meta}
        reduce={reduce}
        setOpen={setOpen}
        status={status}
        title={title}
        tool={tool}
        triggerId={triggerId}
      />

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
            <ToolResultFooter
              canCopy={canCopy}
              copied={copied}
              handleCopy={handleCopy}
              status={status}
              onRetry={onRetry}
            />
          </div>
        </div>
      </AgentDisclosure>
    </div>
  );
}

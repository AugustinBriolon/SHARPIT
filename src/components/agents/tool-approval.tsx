'use client';
// beui.dev/components/agents/chat-app

import { useId } from 'react';
import { useReducedMotion } from 'motion/react';
import { AgentCode, type AgentCodeLanguage } from '@/components/agents/agent-code';
import {
  ToolApprovalHeader,
  ToolApprovalParameters,
  ToolApprovalPendingActions,
} from '@/components/agents/tool-approval-parts';
import { useToolApprovalOpen } from '@/components/agents/use-tool-approval';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

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

export function ToolApprovalCode({ code, language = 'bash', className }: ToolApprovalCodeProps) {
  return (
    <AgentCode
      code={code}
      language={language}
      className={cn(
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
  const { currentOpen, setOpen } = useToolApprovalOpen({ open, defaultOpen, onOpenChange, status });
  const busy = status === 'approving' || status === 'running';
  const pending = status === 'pending';
  const error = status === 'error';

  return (
    <div
      aria-busy={busy}
      data-state={status}
      className={cn(
        'border-border/60 bg-muted/20 w-full overflow-hidden rounded-2xl border text-sm',
        className,
      )}
    >
      <ToolApprovalHeader
        busy={busy}
        currentOpen={currentOpen}
        description={description}
        detailsId={detailsId}
        error={error}
        parameters={parameters}
        reduce={reduce}
        setOpen={setOpen}
        status={status}
        title={title}
        tool={tool}
      />
      <ToolApprovalParameters
        currentOpen={currentOpen}
        detailsId={detailsId}
        parameters={parameters}
      />
      <ToolApprovalPendingActions
        pending={pending}
        onAlwaysAllow={onAlwaysAllow}
        onApprove={onApprove}
        onDeny={onDeny}
      />
    </div>
  );
}

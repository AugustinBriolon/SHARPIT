'use client';
// beui.dev/components/agents/chat-app

import { type ReactNode } from 'react';
import type { AgentCodeLanguage } from '@/components/agents/agent-code';

export type FileDiffStatus = 'streaming' | 'complete';
export type FileDiffLineType = 'added' | 'removed' | 'context';

export interface FileDiffLine {
  id: string;
  type?: FileDiffLineType;
  oldLine?: number;
  newLine?: number;
  content: string;
}

export interface FileDiffProps {
  file: ReactNode;
  lines: FileDiffLine[];
  status?: FileDiffStatus;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapseOnComplete?: boolean;
  maxHeight?: number;
  language?: AgentCodeLanguage;
  copyText?: string;
  onCopy?: () => void | Promise<void>;
  className?: string;
}

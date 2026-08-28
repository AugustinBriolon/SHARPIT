'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgentCodeTokens } from '@/components/agents/agent-code';
import type { FileDiffProps } from './file-diff-types';

export function useFileDiffOpenState({
  open,
  defaultOpen = true,
  onOpenChange,
  status = 'streaming',
  collapseOnComplete = true,
}: Pick<FileDiffProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'status' | 'collapseOnComplete'>) {
  const previousStatus = useRef(status);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
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
    if (previousStatus.current !== 'streaming' && status === 'streaming') {
      setOpen(true);
    }
    if (previousStatus.current === 'streaming' && status === 'complete' && collapseOnComplete) {
      setOpen(false);
    }
    previousStatus.current = status;
  }, [collapseOnComplete, setOpen, status]);

  return { currentOpen, setOpen };
}

export function useFileDiffCopy({ copyText, onCopy }: Pick<FileDiffProps, 'copyText' | 'onCopy'>) {
  const copyTimer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(
    () => () => {
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }
    },
    [],
  );

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

  return { copied, handleCopy };
}

export function useFileDiffTokens(
  lines: FileDiffProps['lines'],
  language: FileDiffProps['language'],
) {
  const code = lines.map((line) => line.content).join('\n');
  return useAgentCodeTokens(code, language ?? 'typescript');
}

export function fileDiffCounts(lines: FileDiffProps['lines']) {
  return {
    additions: lines.filter((line) => line.type === 'added').length,
    deletions: lines.filter((line) => line.type === 'removed').length,
  };
}

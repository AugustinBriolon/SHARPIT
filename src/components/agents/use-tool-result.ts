'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ToolResultProps } from './tool-result';

export function useToolResultOpen({
  open,
  defaultOpen = true,
  onOpenChange,
  status = 'running',
  collapseOnComplete = true,
}: Pick<
  ToolResultProps,
  'open' | 'defaultOpen' | 'onOpenChange' | 'status' | 'collapseOnComplete'
>) {
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
    if (previousStatus.current !== 'running' && status === 'running') {
      setOpen(true);
    }
    if (previousStatus.current === 'running' && status !== 'running' && collapseOnComplete) {
      setOpen(false);
    }
    previousStatus.current = status;
  }, [collapseOnComplete, setOpen, status]);

  return { currentOpen, setOpen };
}

export function useToolResultCopy({
  copyText,
  onCopy,
}: Pick<ToolResultProps, 'copyText' | 'onCopy'>) {
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

export function useToolResultAutoScroll(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  currentOpen: boolean,
  running: boolean,
  reduce: boolean,
) {
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
}

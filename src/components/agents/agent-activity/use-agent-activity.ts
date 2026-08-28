'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AgentActivityProps } from './types';
import { getContentType } from './agent-activity-utils';

function useContentHeight(contentRef: React.RefObject<HTMLDivElement | null>) {
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    const measure = () => setContentHeight(node.offsetHeight);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [contentRef]);

  return contentHeight;
}

function activityViewportMetrics(contentHeight: number, maxHeight: number, working: boolean) {
  const cappedHeight = Math.min(contentHeight, Math.max(0, maxHeight));
  const viewportHeight = working ? Math.max(0, maxHeight) : cappedHeight;
  const capped = contentHeight > maxHeight;
  const streamOffset = working ? Math.min(0, viewportHeight - contentHeight) : 0;
  return { capped, streamOffset, viewportHeight };
}

function useControlledOpen(
  open: boolean | undefined,
  defaultOpen: boolean,
  onOpenChange?: (open: boolean) => void,
) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return { currentOpen, setOpen };
}

export function useAgentActivityLayout({
  items,
  contentType: initialContentType,
  status = 'working',
  maxHeight = 208,
  collapseOnComplete = true,
  open,
  defaultOpen = false,
  onOpenChange,
}: Pick<
  AgentActivityProps,
  | 'items'
  | 'contentType'
  | 'status'
  | 'maxHeight'
  | 'collapseOnComplete'
  | 'open'
  | 'defaultOpen'
  | 'onOpenChange'
>) {
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousStatus = useRef(status);
  const { currentOpen, setOpen } = useControlledOpen(open, defaultOpen, onOpenChange);
  const contentHeight = useContentHeight(contentRef);

  const working = status === 'working';
  const expanded = working || currentOpen;
  const contentType = items.length ? getContentType(items) : (initialContentType ?? 'mixed');
  const metrics = activityViewportMetrics(contentHeight, maxHeight, working);

  useEffect(() => {
    if (previousStatus.current === 'working' && status === 'complete') {
      setOpen(!collapseOnComplete);
    }
    previousStatus.current = status;
  }, [collapseOnComplete, status]);

  const toggle = () => {
    const next = !currentOpen;
    setOpen(next);
    if (next) {
      requestAnimationFrame(() => viewportRef.current?.scrollTo({ top: 0 }));
    }
  };

  return {
    ...metrics,
    contentRef,
    contentType,
    expanded,
    toggle,
    viewportRef,
    working,
  };
}

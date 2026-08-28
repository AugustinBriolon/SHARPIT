'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToolApprovalProps } from './tool-approval';

export function useToolApprovalOpen({
  open,
  defaultOpen = false,
  onOpenChange,
  status = 'pending',
}: Pick<ToolApprovalProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'status'>) {
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
    if (previousStatus.current === 'pending' && status !== 'pending') {
      setOpen(false);
    }
    previousStatus.current = status;
  }, [setOpen, status]);

  return { currentOpen, setOpen };
}

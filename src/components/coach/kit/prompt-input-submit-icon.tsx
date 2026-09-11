'use client';

import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PromptSubmitIcon({ loading, className }: { loading: boolean; className?: string }) {
  if (loading) {
    return <Square className={cn('size-3 fill-current', className)} aria-hidden />;
  }
  return <ArrowUp className={cn('size-3.5', className)} aria-hidden />;
}

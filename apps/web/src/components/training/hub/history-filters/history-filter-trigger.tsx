'use client';

import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HistoryFilterTrigger({
  activeCount,
  ariaControls,
  isActive,
  onClick,
  open,
}: {
  activeCount: number;
  ariaControls?: string;
  isActive: boolean;
  onClick: () => void;
  open: boolean;
}) {
  return (
    <button
      aria-controls={ariaControls}
      aria-expanded={open}
      aria-haspopup="true"
      type="button"
      className={cn(
        'pressable inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm lg:min-h-9 lg:py-1.5',
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onClick}
    >
      <SlidersHorizontal className="size-3.5" aria-hidden />
      Filtres
      {isActive ? (
        <span className="text-highlight text-data text-xs font-bold">{activeCount}</span>
      ) : null}
    </button>
  );
}

'use client';

import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact calendar header: click → full brick view.
 */
export function BrickChipHeader({
  totalMin,
  allDone,
  onOpen,
}: {
  totalMin: number;
  allDone: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      title="Voir le brick"
      type="button"
      className={cn(
        'hover:bg-primary/10 mb-0.5 flex w-full items-center gap-1 rounded-sm px-0.5 py-0.5 text-left transition-colors',
        allDone && 'opacity-90',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <Layers className="text-primary size-2.5 shrink-0" />
      <span className="text-primary text-[9px] font-semibold tracking-wider uppercase">Brick</span>
      {totalMin > 0 && (
        <span className="text-muted-foreground ml-auto shrink-0 text-[9px] tabular-nums">
          {totalMin} min
        </span>
      )}
    </button>
  );
}

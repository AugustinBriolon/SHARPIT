'use client';

import { useRef } from 'react';
import type { PhysicalReassessment } from '@/components/planning/session/realize/physical-reassessment-card';
import {
  clampReassessmentIndex,
  reassessmentChipLabel,
  reassessmentRemainingLabel,
} from '@/lib/physical-health/reassessment-pager';
import { cn } from '@/lib/utils';

function InjuryStepChip({
  item,
  selected,
  onSelect,
}: {
  item: PhysicalReassessment;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-label={item.noteTitle}
      aria-selected={selected}
      role="tab"
      type="button"
      className={cn(
        'pressable shrink-0 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold whitespace-nowrap transition-colors',
        selected
          ? 'border-highlight bg-highlight text-highlight-foreground'
          : 'border-foreground/20 bg-background text-foreground hover:border-highlight/50 hover:bg-muted/40',
      )}
      onClick={onSelect}
    >
      {reassessmentChipLabel(item.noteTitle)}
    </button>
  );
}

export function InjuryStepStrip({
  items,
  index,
  onIndexChange,
}: {
  items: PhysicalReassessment[];
  index: number;
  onIndexChange: (next: number) => void;
}) {
  if (items.length <= 1) {
    return null;
  }

  const remaining = reassessmentRemainingLabel(items.length);

  return (
    <div className="flex items-center gap-2">
      <div
        aria-label="Blessures à réévaluer"
        className="flex min-w-0 flex-1 [scrollbar-width:none] gap-1.5 overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {items.map((item, itemIndex) => (
          <InjuryStepChip
            key={item.noteId}
            item={item}
            selected={itemIndex === index}
            onSelect={() => onIndexChange(itemIndex)}
          />
        ))}
      </div>
      {remaining ? (
        <p className="text-label text-muted-foreground shrink-0 tabular-nums">{remaining}</p>
      ) : null}
    </div>
  );
}

export function useReassessmentSwipeHandlers(
  index: number,
  length: number,
  onIndexChange: (next: number) => void,
) {
  const touchStartX = useRef<number | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null || length <= 1) {
        return;
      }
      const delta = e.changedTouches[0]?.clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) < 48) {
        return;
      }
      onIndexChange(clampReassessmentIndex(index + (delta < 0 ? 1 : -1), length));
    },
  };
}

export function advanceReassessmentQueue(
  queue: PhysicalReassessment[],
  index: number,
  noteId: string,
): { nextQueue: PhysicalReassessment[]; nextIndex: number } {
  const nextQueue = queue.filter((item) => item.noteId !== noteId);
  return {
    nextQueue,
    nextIndex: clampReassessmentIndex(index, nextQueue.length),
  };
}

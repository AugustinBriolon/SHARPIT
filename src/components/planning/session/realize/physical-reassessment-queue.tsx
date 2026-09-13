'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  PhysicalReassessmentCard,
  type PhysicalReassessment,
} from '@/components/planning/session/realize/physical-reassessment-card';
import {
  clampReassessmentIndex,
  reassessmentIndexFromSlider,
  reassessmentProgressLabel,
  reassessmentSliderValue,
} from '@/lib/physical-health/reassessment-pager';

function ReassessmentDoneBanner({ noteTitle, severity }: { noteTitle: string; severity: number }) {
  return (
    <p className="text-primary text-xs">
      Suivi mis à jour : {noteTitle} ({severity}/10)
    </p>
  );
}

function ReassessmentPagerControls({
  index,
  length,
  onIndexChange,
}: {
  index: number;
  length: number;
  onIndexChange: (next: number) => void;
}) {
  if (length <= 1) {
    return null;
  }

  const label = reassessmentProgressLabel(index, length);
  const slider = reassessmentSliderValue(index, length);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          aria-label="Douleur précédente"
          className="text-muted-foreground hover:text-foreground pressable inline-flex size-9 items-center justify-center rounded-md disabled:opacity-30"
          disabled={index <= 0}
          type="button"
          onClick={() => onIndexChange(clampReassessmentIndex(index - 1, length))}
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-label text-muted-foreground tabular-nums">{label}</p>
        <button
          aria-label="Douleur suivante"
          className="text-muted-foreground hover:text-foreground pressable inline-flex size-9 items-center justify-center rounded-md disabled:opacity-30"
          disabled={index >= length - 1}
          type="button"
          onClick={() => onIndexChange(clampReassessmentIndex(index + 1, length))}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <input
        aria-label="Choisir la douleur à suivre"
        aria-valuemax={length}
        aria-valuemin={1}
        aria-valuenow={index + 1}
        className="accent-highlight h-2 w-full cursor-pointer"
        max={1}
        min={0}
        step={1 / (length - 1)}
        type="range"
        value={slider}
        onChange={(e) => onIndexChange(reassessmentIndexFromSlider(Number(e.target.value), length))}
      />
    </div>
  );
}

/**
 * Multi-injury pager: swipe between remaining pains, slider for clear progress.
 * Save / dismiss removes the current item from the queue.
 */
export function PhysicalReassessmentQueue({ items }: { items: PhysicalReassessment[] }) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [lastSaved, setLastSaved] = useState<{ noteTitle: string; severity: number } | null>(null);
  const touchStartX = useRef<number | null>(null);

  if (queue.length === 0) {
    return lastSaved ? (
      <ReassessmentDoneBanner noteTitle={lastSaved.noteTitle} severity={lastSaved.severity} />
    ) : null;
  }

  const safeIndex = clampReassessmentIndex(index, queue.length);
  const current = queue[safeIndex];

  function advanceAfterResolve(
    result: { kind: 'saved'; noteTitle: string; severity: number } | { kind: 'dismissed' },
  ) {
    if (result.kind === 'saved') {
      setLastSaved({ noteTitle: result.noteTitle, severity: result.severity });
    }
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== safeIndex);
      setIndex(clampReassessmentIndex(safeIndex, next.length));
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {lastSaved ? (
        <ReassessmentDoneBanner noteTitle={lastSaved.noteTitle} severity={lastSaved.severity} />
      ) : null}
      <ReassessmentPagerControls index={safeIndex} length={queue.length} onIndexChange={setIndex} />
      <div
        className="border-analysis-border/40 touch-pan-y rounded-xl border px-3 py-3"
        onTouchEnd={(e) => {
          if (touchStartX.current === null || queue.length <= 1) {
            return;
          }
          const delta = e.changedTouches[0]?.clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) < 48) {
            return;
          }
          setIndex(clampReassessmentIndex(safeIndex + (delta < 0 ? 1 : -1), queue.length));
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
      >
        <PhysicalReassessmentCard
          key={current.noteId}
          item={current}
          onResolved={advanceAfterResolve}
        />
      </div>
    </div>
  );
}

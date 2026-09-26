'use client';

import { useState } from 'react';
import {
  PhysicalReassessmentCard,
  type PhysicalReassessment,
} from '@/components/planning/session/realize/physical-reassessment-card';
import { clampReassessmentIndex } from '@sharpit/app/lib/physical-health/reassessment-pager';
import {
  InjuryStepStrip,
  useReassessmentSwipeHandlers,
} from '@/components/planning/session/realize/physical-reassessment-queue-parts';

function ReassessmentDoneBanner({ noteTitle, severity }: { noteTitle: string; severity: number }) {
  return (
    <p className="text-primary text-xs">
      Suivi mis à jour : {noteTitle} ({severity}/10)
    </p>
  );
}

/**
 * Multi-injury pager: named chips; swipe between remaining pains.
 * Save / dismiss removes the current item from the queue.
 */
export function PhysicalReassessmentQueue({ items }: { items: PhysicalReassessment[] }) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [lastSaved, setLastSaved] = useState<{ noteTitle: string; severity: number } | null>(null);

  if (queue.length === 0) {
    return lastSaved ? (
      <ReassessmentDoneBanner noteTitle={lastSaved.noteTitle} severity={lastSaved.severity} />
    ) : null;
  }

  const safeIndex = clampReassessmentIndex(index, queue.length);
  const current = queue[safeIndex];
  const swipeHandlers = useReassessmentSwipeHandlers(safeIndex, queue.length, setIndex);

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
    <div className="space-y-2.5">
      {lastSaved ? (
        <ReassessmentDoneBanner noteTitle={lastSaved.noteTitle} severity={lastSaved.severity} />
      ) : null}
      <InjuryStepStrip index={safeIndex} items={queue} onIndexChange={setIndex} />
      <div className="touch-pan-y" {...swipeHandlers}>
        <PhysicalReassessmentCard
          key={current.noteId}
          hideTitle={queue.length > 1}
          item={current}
          onResolved={advanceAfterResolve}
        />
      </div>
    </div>
  );
}

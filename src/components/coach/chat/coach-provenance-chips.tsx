'use client';

import { useMemo } from 'react';
import { buildCoachProvenanceChips } from '@/lib/coach/coach-provenance';
import { trainingDayIdForNow } from '@/lib/training/training-day';
import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';

/**
 * Hairline provenance pills under the latest coach reply — which signals the
 * advice is grounded on (Bande ink §6). Silent when signals are unavailable.
 */
export function CoachProvenanceChips() {
  const trainingDayId = useMemo(() => trainingDayIdForNow(), []);
  const { data } = useTodayPresentationViewModel(trainingDayId);
  const metricsRow = data?.hero.metricsRow;

  const chips = useMemo(
    () =>
      buildCoachProvenanceChips({
        recoveryScore: metricsRow?.recoveryScore ?? null,
        sleepScore: metricsRow?.sleepScore ?? null,
      }),
    [metricsRow?.recoveryScore, metricsRow?.sleepScore],
  );

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="border-analysis-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.75 text-[10.5px]"
        >
          <span className={`size-1.5 shrink-0 rounded-full ${chip.dotClass}`} aria-hidden />
          {chip.label}
        </span>
      ))}
    </div>
  );
}

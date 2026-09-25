'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { buildCoachProvenanceChips } from '@/lib/coach/chat/transcript/coach-provenance';
import { trainingDayIdForNow } from '@/lib/training/periodization/training-day';
import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { cn } from '@/lib/utils';

/**
 * Streaming Text « sources » row — hairline provenance under the latest reply.
 * Silent when signals are unavailable (Bande ink §6).
 */
export function CoachProvenanceChips() {
  const reduce = useReducedMotion() ?? false;
  const trainingDayId = trainingDayIdForNow();
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

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
      <span className="text-muted-foreground/80 text-[11px] font-medium tracking-wide">
        Sources
      </span>
      {chips.map((chip, index) => (
        <motion.span
          key={chip.key}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          initial={reduce ? false : { opacity: 0, transform: 'translateY(4px)' }}
          className={cn(
            'bg-muted/60 text-muted-foreground ring-border/50',
            'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1',
            'text-[11px] font-medium ring-1 ring-inset',
          )}
          transition={{
            duration: reduce ? 0 : 0.18,
            delay: reduce ? 0 : Math.min(index * 0.04, 0.16),
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          <span className={cn('size-1.5 shrink-0 rounded-full', chip.dotClass)} aria-hidden />
          <span className="truncate">{chip.label}</span>
        </motion.span>
      ))}
    </div>
  );
}

'use client';

import { Loader2 } from 'lucide-react';
import { CoachReasoning } from '@/components/coach/chat/coach-reasoning';
import type { CoachGenerationProgress } from '@/hooks/use-coach';

/**
 * What the athlete watches while a plan or an adaptation is being generated.
 *
 * These calls take tens of seconds, nearly all of it spent on model reasoning
 * that used to be discarded — the dialog showed a spinner and nothing else.
 * Surfacing the deliberation, plus a live count of proposals recovered from the
 * partial JSON, turns the wait into visible progress.
 */
export function CoachGenerationProgressPanel({
  progress,
  itemNoun,
}: {
  progress: CoachGenerationProgress | null;
  /** Singular noun for the streamed items, e.g. "séance" or "ajustement". */
  itemNoun: string;
}) {
  const count = progress?.partialCount ?? 0;

  return (
    <div aria-live="polite" className="space-y-2">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        {count > 0
          ? `${count} ${itemNoun}${count > 1 ? 's' : ''} en cours de rédaction…`
          : 'Le coach analyse tes données…'}
      </p>
      {progress?.reasoning ? (
        <CoachReasoning hasAnswerText={count > 0} text={progress.reasoning} streaming />
      ) : null}
    </div>
  );
}

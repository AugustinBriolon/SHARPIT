'use client';

import { Loader2 } from 'lucide-react';
import type { CoachGenerationProgress } from '@/hooks/use-coach';

/**
 * What the athlete watches while a plan or an adaptation is being generated.
 *
 * These calls take tens of seconds. A live count of proposals recovered from
 * the partial JSON, once any have landed, turns the wait into visible
 * progress instead of a bare spinner.
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
    <p aria-live="polite" className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      {count > 0
        ? `${count} ${itemNoun}${count > 1 ? 's' : ''} en cours de rédaction…`
        : 'Le coach analyse tes données…'}
    </p>
  );
}

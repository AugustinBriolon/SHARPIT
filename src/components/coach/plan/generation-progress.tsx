'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CoachGenerationProgress } from '@/hooks/use-coach';
import { coachGenerationStatusCopy } from '@/lib/coach/plan/generation-status-copy';

/**
 * What the athlete watches while a plan or an adaptation is being generated.
 *
 * These calls take tens of seconds. Progressive consultation copy, then a live
 * count of proposals once any have landed — always a single status line.
 */
export function CoachGenerationProgressPanel({
  progress,
  itemNoun,
}: {
  progress: CoachGenerationProgress | null;
  /** Singular noun for the streamed items, e.g. "séance" or "ajustement". */
  itemNoun: string;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    setElapsedMs(0);
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const copy = coachGenerationStatusCopy({
    elapsedMs,
    partialCount: progress?.partialCount ?? 0,
    itemNoun,
  });

  return (
    <p aria-live="polite" className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      <span>{copy}</span>
    </p>
  );
}

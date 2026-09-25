'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LinkAnalysisPhase = 'idle' | 'linking' | 'analyzing' | 'done';

const PHASE_COPY: Record<Exclude<LinkAnalysisPhase, 'idle'>, string> = {
  linking: 'Liaison en cours…',
  analyzing: 'Analyse de conformité…',
  done: 'Analyse terminée',
};

/**
 * Compact progress strip for session link + post-link analysis.
 * Opacity-only motion — respects prefers-reduced-motion via CSS.
 */
export function LinkAnalysisStatus({
  phase,
  className,
}: {
  phase: Exclude<LinkAnalysisPhase, 'idle'>;
  className?: string;
}) {
  const isDone = phase === 'done';

  return (
    <div
      aria-live="polite"
      role="status"
      className={cn(
        'border-analysis-border/70 bg-analysis-surface-alt/60 rounded-analysis flex items-center gap-2.5 border px-3 py-2',
        className,
      )}
    >
      {isDone ? (
        <CheckCircle2 className="text-primary size-4 shrink-0" aria-hidden />
      ) : (
        <Loader2
          className="text-primary size-4 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-foreground/90 text-xs font-medium">{PHASE_COPY[phase]}</p>
        {!isDone ? (
          <div
            className="bg-muted/60 link-analysis-track h-0.5 overflow-hidden rounded-full"
            aria-hidden
          >
            <span className="link-analysis-bar bg-primary/70 block h-full w-1/3 rounded-full" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

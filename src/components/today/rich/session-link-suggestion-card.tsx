'use client';

import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import {
  SessionLinkSuggestionDetails,
  sessionLinkShowExpertHint,
} from '@/components/today/rich/session-link-suggestion-parts';
import { useSessionLinkSuggestionPhase } from '@/components/today/rich/use-session-link-suggestion-phase';

export type SessionLinkSuggestionVm = {
  id: string;
  plannedSessionId: string;
  activityId: string;
  activityType: import('@prisma/client').ActivityType;
  score: number;
  matchLabel: string;
  plannedPrimary: string;
  plannedSecondary?: string | null;
  activityPrimary: string;
  activitySecondary?: string | null;
};

/**
 * Chip Today avec disclosure — une décision rapprocher réalisé / prévu.
 */
export function SessionLinkSuggestionCard({
  suggestion,
  onLinked,
  onDismiss,
  onOpenPlanned,
}: {
  suggestion: SessionLinkSuggestionVm;
  onLinked?: () => void;
  onDismiss?: () => void;
  onOpenPlanned?: () => void;
}) {
  const { isExpert } = useDisplayMode();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const headingId = useId();
  const whyId = useId();

  const { busy, errorMessage, handleDismiss, handleLink, phase } = useSessionLinkSuggestionPhase({
    activityId: suggestion.activityId,
    onDismiss,
    onLinked,
    plannedSessionId: suggestion.plannedSessionId,
    suggestionId: suggestion.id,
  });

  useEffect(() => {
    if (phase === 'linking' || phase === 'analyzing') {
      const details = detailsRef.current;
      if (details) {
        details.open = true;
      }
    }
  }, [phase]);

  const showExpertHint = sessionLinkShowExpertHint(isExpert, suggestion);

  return (
    <article
      aria-busy={busy || undefined}
      aria-labelledby={headingId}
      className={cn(
        'chip-surface-lg border-primary/25 rounded-analysis relative overflow-hidden border',
        busy && 'border-primary/40',
      )}
    >
      <details ref={detailsRef} className="group min-w-0 px-3 py-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-1 items-start gap-2">
            <ActivityTypeIndicator type={suggestion.activityType} />
            <span className="min-w-0 space-y-0.5">
              <p className="text-foreground line-clamp-1 text-sm font-medium" id={headingId}>
                {suggestion.activityPrimary}
              </p>
              <p className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
                <span className="text-primary/90 shrink-0 font-medium">
                  {suggestion.matchLabel}
                </span>
                <span className="opacity-30" aria-hidden>
                  ·
                </span>
                <span className="min-w-0 truncate" title={suggestion.plannedPrimary}>
                  Prévu · {suggestion.plannedPrimary}
                </span>
              </p>
            </span>
          </span>
          <ChevronRight
            className="text-muted-foreground/70 size-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden
          />
        </summary>

        <SessionLinkSuggestionDetails
          busy={busy}
          errorMessage={errorMessage}
          phase={phase}
          showExpertHint={showExpertHint}
          suggestion={suggestion}
          whyId={whyId}
          onDismiss={handleDismiss}
          onLink={handleLink}
          onOpenPlanned={onOpenPlanned}
        />
      </details>
    </article>
  );
}

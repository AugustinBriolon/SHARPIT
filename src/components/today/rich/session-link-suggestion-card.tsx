'use client';

import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { Button } from '@/components/ui/button';
import {
  LinkAnalysisStatus,
  type LinkAnalysisPhase,
} from '@/components/planning/session/link-analysis-status';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import { dismissSessionLinkSuggestion } from '@/lib/today/session-link-dismissals';
import { cn } from '@/lib/utils';
import { ChevronRight, Link2, Microscope } from 'lucide-react';
import { DEMO_SESSION_LINK_READING_DELAY_MS } from '@/lib/demo/demo-session-link-reading';
import { useEffect, useId, useRef, useState } from 'react';

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

type LinkPhase = 'idle' | 'linking' | 'analyzing' | 'done';

function hasLoadMeta(secondary?: string | null): boolean {
  return Boolean(secondary?.toLowerCase().includes('tss'));
}

function linkErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'La liaison a échoué. Réessaie dans un instant.';
}

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
  const { link } = usePlannedSessionMutations();
  const { isExpert } = useDisplayMode();
  const isDemo = useIsDemoMode();
  const [phase, setPhase] = useState<LinkPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const headingId = useId();
  const whyId = useId();

  const busy = phase === 'linking' || phase === 'analyzing' || link.isPending;

  useEffect(() => {
    if (phase === 'linking' || phase === 'analyzing') {
      const details = detailsRef.current;
      if (details) details.open = true;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'analyzing' || !isDemo) return;
    const timer = window.setTimeout(() => {
      setPhase('done');
      window.setTimeout(() => {
        setPhase('idle');
        onLinked?.();
      }, 900);
    }, DEMO_SESSION_LINK_READING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isDemo, onLinked, phase]);

  function handleLink() {
    setErrorMessage(null);
    setPhase('linking');
    link.mutate(
      { id: suggestion.plannedSessionId, activityId: suggestion.activityId },
      {
        onSuccess: () => {
          if (isDemo) {
            setPhase('analyzing');
            return;
          }
          setPhase('idle');
          onLinked?.();
        },
        onError: (error) => {
          setPhase('idle');
          setErrorMessage(linkErrorMessage(error));
        },
      },
    );
  }

  function handleDismiss() {
    dismissSessionLinkSuggestion(suggestion.id);
    onDismiss?.();
  }

  const showExpertHint =
    isExpert &&
    (hasLoadMeta(suggestion.plannedSecondary) || hasLoadMeta(suggestion.activitySecondary));

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

        <div className="space-y-3 pt-3 pb-0.5">
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty" id={whyId}>
            {suggestion.matchLabel} — associe pour comparer plan et réalisé{' '}
            <span className="text-foreground/75">(écart charge, durée, intensité)</span>.
          </p>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
            <SessionLinkSide
              label="Réalisé"
              meta={suggestion.activitySecondary}
              title={suggestion.activityPrimary}
              type={suggestion.activityType}
            />
            <div className="text-muted-foreground flex items-center justify-center sm:flex-col sm:py-2">
              <Link2 className="size-4 rotate-90 sm:rotate-0" aria-hidden />
            </div>
            <SessionLinkSide
              label="Prévu"
              meta={suggestion.plannedSecondary}
              title={suggestion.plannedPrimary}
              type={suggestion.activityType}
            />
          </div>

          {showExpertHint ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <Microscope className="size-3.5 shrink-0" aria-hidden />
              Mode Expert · écart plan / réalisé visible après association
            </p>
          ) : null}

          {phase === 'linking' || phase === 'analyzing' || phase === 'done' ? (
            <LinkAnalysisStatus phase={phase as Exclude<LinkAnalysisPhase, 'idle'>} />
          ) : null}

          {errorMessage ? (
            <p className="text-destructive text-xs leading-relaxed" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              aria-describedby={whyId}
              disabled={busy}
              size="sm"
              type="button"
              variant="highlight"
              onClick={handleLink}
            >
              Associer
            </Button>
            <Button disabled={busy} size="sm" type="button" variant="ghost" onClick={handleDismiss}>
              Garder séparées
            </Button>
            {onOpenPlanned ? (
              <Button
                disabled={busy}
                size="sm"
                type="button"
                variant="ghost"
                onClick={onOpenPlanned}
              >
                Voir le détail planifié
              </Button>
            ) : null}
          </div>
        </div>
      </details>
    </article>
  );
}

function SessionLinkSide({
  label,
  title,
  meta,
  type,
}: {
  label: string;
  title: string;
  meta?: string | null;
  type: import('@prisma/client').ActivityType;
}) {
  return (
    <div className="chip-surface rounded-analysis min-h-11 space-y-1 px-3 py-2.5">
      <p className="text-label text-muted-foreground">{label}</p>
      <div className="flex items-start gap-1.5">
        <ActivityTypeIndicator type={type} />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium" title={title}>
            {title}
          </p>
          {meta ? (
            <p className="text-muted-foreground text-xs" title={meta}>
              {meta}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

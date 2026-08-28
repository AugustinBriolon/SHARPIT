'use client';

import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { Button } from '@/components/ui/button';
import {
  LinkAnalysisStatus,
  type LinkAnalysisPhase,
} from '@/components/planning/session/link-analysis-status';
import { hasLoadMeta } from '@/components/today/rich/session-link-suggestion-helpers';
import type { SessionLinkSuggestionVm } from '@/components/today/rich/session-link-suggestion-card';
import { Link2, Microscope } from 'lucide-react';

export function SessionLinkSuggestionDetails({
  suggestion,
  showExpertHint,
  phase,
  errorMessage,
  busy,
  whyId,
  onLink,
  onDismiss,
  onOpenPlanned,
}: {
  suggestion: SessionLinkSuggestionVm;
  showExpertHint: boolean;
  phase: 'idle' | 'linking' | 'analyzing' | 'done';
  errorMessage: string | null;
  busy: boolean;
  whyId: string;
  onLink: () => void;
  onDismiss: () => void;
  onOpenPlanned?: () => void;
}) {
  return (
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
          onClick={onLink}
        >
          Associer
        </Button>
        <Button disabled={busy} size="sm" type="button" variant="ghost" onClick={onDismiss}>
          Garder séparées
        </Button>
        {onOpenPlanned ? (
          <Button disabled={busy} size="sm" type="button" variant="ghost" onClick={onOpenPlanned}>
            Voir le détail planifié
          </Button>
        ) : null}
      </div>
    </div>
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

export function sessionLinkShowExpertHint(
  isExpert: boolean,
  suggestion: SessionLinkSuggestionVm,
): boolean {
  return (
    isExpert &&
    (hasLoadMeta(suggestion.plannedSecondary) || hasLoadMeta(suggestion.activitySecondary))
  );
}

'use client';

import Link from 'next/link';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { Button } from '@/components/ui/button';
import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';
import { activityTypeLabels, formatDate, formatDuration } from '@sharpit/server/lib/format';
import { LinkAnalysisStatus } from '@/components/planning/session/link-analysis-status';
import { formatActivityMatchLabel } from '@sharpit/server/lib/planned-session/linking/session-link-match-score';
import { Link2 } from 'lucide-react';
import type { SessionCandidate } from '@/components/planning/session/realize/use-session-realization-state';

function ActivityCandidateRow({
  candidate,
  session,
  onLink,
}: {
  candidate: SessionCandidate;
  session: ClientPlannedSession;
  onLink: (activityId: string) => void;
}) {
  const { a, diff, sameType } = candidate;
  return (
    <button
      key={a.id}
      className="border-analysis-border/60 bg-analysis-surface-alt/70 hover:border-primary/40 flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left"
      type="button"
      onClick={() => onLink(a.id)}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <ActivityTypeIndicator type={a.type} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{a.title ?? activityTypeLabels[a.type]}</p>
          <p className="text-muted-foreground text-xs">
            {formatDate(a.date)} · {formatDuration(a.duration)}
            {diff === 0 && sameType ? ' · même jour' : ''}
          </p>
        </div>
      </div>
      <span
        className="text-label text-primary shrink-0 normal-case"
        title="Correspondance date et durée avec la séance planifiée"
      >
        {formatActivityMatchLabel(
          { date: session.date, durationMin: session.durationMin },
          { date: a.date, duration: a.duration },
        )}
      </span>
    </button>
  );
}

export function ActivityPickerList({
  candidates,
  session,
  onLink,
}: {
  candidates: SessionCandidate[];
  session: ClientPlannedSession;
  onLink: (activityId: string) => void;
}) {
  if (candidates.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-center text-xs">
        Aucune activité trouvée.{' '}
        <Link className="text-primary hover:underline" href="/settings/integrations">
          Synchronise Garmin
        </Link>{' '}
        ou ajoute une activité manuelle, puis réessaie.
      </p>
    );
  }

  return (
    <>
      {candidates.map((candidate) => (
        <ActivityCandidateRow
          key={candidate.a.id}
          candidate={candidate}
          session={session}
          onLink={onLink}
        />
      ))}
    </>
  );
}

function UnlinkedPickerFooter({
  showAll,
  onToggleShowAll,
  onPickerClose,
}: {
  showAll: boolean;
  onToggleShowAll: () => void;
  onPickerClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        className="text-muted-foreground hover:text-foreground text-xs"
        type="button"
        onClick={onToggleShowAll}
      >
        {showAll ? 'Activités proches' : 'Voir toutes les activités'}
      </button>
      <button
        className="text-muted-foreground hover:text-foreground text-xs"
        type="button"
        onClick={onPickerClose}
      >
        Annuler
      </button>
    </div>
  );
}

function UnlinkedPickerPanel({
  isLinking,
  isAnalyzing,
  candidates,
  session,
  showAll,
  onLink,
  onPickerClose,
  onToggleShowAll,
}: {
  isLinking: boolean;
  isAnalyzing: boolean;
  candidates: SessionCandidate[];
  session: ClientPlannedSession;
  showAll: boolean;
  onLink: (activityId: string) => void;
  onPickerClose: () => void;
  onToggleShowAll: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        Choisis l&apos;activité qui correspond à cette séance planifiée :
      </p>
      {isLinking ? <LinkAnalysisStatus phase="linking" /> : null}
      {!isLinking && isAnalyzing ? <LinkAnalysisStatus phase="analyzing" /> : null}
      {!isLinking && !isAnalyzing ? (
        <>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            <ActivityPickerList candidates={candidates} session={session} onLink={onLink} />
          </div>
          <UnlinkedPickerFooter
            showAll={showAll}
            onPickerClose={onPickerClose}
            onToggleShowAll={onToggleShowAll}
          />
        </>
      ) : null}
    </div>
  );
}

export function UnlinkedSessionRealization({
  pickerOpen,
  isLinking,
  isAnalyzing,
  candidates,
  session,
  showAll,
  onLink,
  onPickerOpen,
  onPickerClose,
  onToggleShowAll,
}: {
  pickerOpen: boolean;
  isLinking: boolean;
  isAnalyzing: boolean;
  candidates: SessionCandidate[];
  session: ClientPlannedSession;
  showAll: boolean;
  onLink: (activityId: string) => void;
  onPickerOpen: () => void;
  onPickerClose: () => void;
  onToggleShowAll: () => void;
}) {
  if (!pickerOpen) {
    return (
      <Button
        className="text-muted-foreground hover:text-foreground h-auto min-h-9 font-normal"
        size="sm"
        type="button"
        variant="ghost"
        onClick={onPickerOpen}
      >
        <Link2 className="size-3.5" aria-hidden /> Relier à l&apos;activité faite
      </Button>
    );
  }

  return (
    <UnlinkedPickerPanel
      candidates={candidates}
      isAnalyzing={isAnalyzing}
      isLinking={isLinking}
      session={session}
      showAll={showAll}
      onLink={onLink}
      onPickerClose={onPickerClose}
      onToggleShowAll={onToggleShowAll}
    />
  );
}

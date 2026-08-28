'use client';

import type { ReactNode } from 'react';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { CompletedSessionStory } from '../read/completed-session-story';
import { Button } from '@/components/ui/button';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import { LinkAnalysisStatus } from '@/components/planning/session/link-analysis-status';
import { formatActivityMatchLabel } from '@/lib/planned-session/linking/session-link-match-score';
import { HeartPulse, Link2, Unlink } from 'lucide-react';
import Link from 'next/link';
import {
  PhysicalReassessmentCard,
  type PhysicalReassessment,
} from '@/components/planning/session/realize/physical-reassessment-card';
import type { useSessionAnalysisPoll } from '@/components/planning/session/realize/use-session-analysis-poll';
import {
  useSessionRealizationCandidates,
  useSessionRealizationLinkedActivity,
  useSessionRealizationPicker,
  type SessionCandidate,
} from '@/components/planning/session/realize/use-session-realization-state';
import { useSessionRealizationAnalysis } from '@/components/planning/session/realize/use-session-realization-analysis';

function activityMetric(a: ClientActivity): string {
  if (a.runMetrics?.distanceM) {
    return formatDistance(a.runMetrics.distanceM);
  }
  if (a.bikeMetrics?.avgPower) {
    return `${Math.round(a.bikeMetrics.avgPower)} W`;
  }
  if (a.swimMetrics?.distanceM) {
    return formatDistance(a.swimMetrics.distanceM);
  }
  return formatDuration(a.duration);
}

function AnalysisTimeoutBanner({
  pollTimedOut,
  hasAnalysis,
  guardDisabled,
  analyzePending,
  onRetry,
}: {
  pollTimedOut: boolean;
  hasAnalysis: boolean;
  guardDisabled: boolean;
  analyzePending: boolean;
  onRetry: () => void;
}) {
  if (!pollTimedOut || hasAnalysis) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="border-analysis-border/60 bg-analysis-surface-alt space-y-2 rounded-md border px-3 py-2.5"
    >
      <p className="text-sm font-medium">Analyse indisponible pour le moment</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        La comparaison plan/réel n&apos;a pas abouti dans le délai prévu. Tu peux relancer
        l&apos;analyse manuellement.
      </p>
      <Button
        disabled={guardDisabled || analyzePending}
        size="sm"
        type="button"
        variant="outline"
        onClick={onRetry}
      >
        Relancer l&apos;analyse
      </Button>
    </div>
  );
}

function LinkedActivityCard({ linked, delink }: { linked: ClientActivity; delink: ReactNode }) {
  return (
    <div className="border-analysis-border/60 bg-analysis-surface-alt/50 overflow-hidden rounded-lg border">
      <div className="border-analysis-border/50 flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="text-label">Activité liée</p>
        {delink}
      </div>
      <Link
        className="hover:bg-analysis-surface-alt/80 chip-surface flex items-center justify-between gap-2 px-3 py-2.5 transition-colors"
        href={`/training/${linked.id}`}
      >
        <div className="flex min-w-0 items-start gap-1.5">
          <ActivityTypeIndicator type={linked.type} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {linked.title ?? activityTypeLabels[linked.type]}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDate(linked.date)} · {formatDuration(linked.duration)}
            </p>
          </div>
        </div>
        <span className="text-data text-muted-foreground shrink-0 text-xs">
          {activityMetric(linked)}
        </span>
      </Link>
    </div>
  );
}

function ActivityPickerList({
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
          Synchronise Strava
        </Link>{' '}
        puis réessaie.
      </p>
    );
  }

  return (
    <>
      {candidates.map(({ a, diff, sameType }) => (
        <button
          key={a.id}
          className="border-analysis-border/60 bg-analysis-surface-alt/70 hover:border-primary/40 flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left"
          type="button"
          onClick={() => onLink(a.id)}
        >
          <div className="flex min-w-0 items-start gap-1.5">
            <ActivityTypeIndicator type={a.type} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {a.title ?? activityTypeLabels[a.type]}
              </p>
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
      ))}
    </>
  );
}

function LinkedAnalysisSection({
  session,
  analysis,
  analyzedAt,
  isAnalyzing,
  pollTimedOut,
  painReassessments,
  guardDisabled,
  analyzePending,
  onReanalyze,
}: {
  session: ClientPlannedSession;
  analysis: ReturnType<typeof useSessionAnalysisPoll>['analysis'];
  analyzedAt: ReturnType<typeof useSessionAnalysisPoll>['analyzedAt'];
  isAnalyzing: boolean;
  pollTimedOut: boolean;
  painReassessments: PhysicalReassessment[];
  guardDisabled: boolean;
  analyzePending: boolean;
  onReanalyze: () => void;
}) {
  const hasAnalysis = Boolean(analysis && analyzedAt);

  return (
    <div className="space-y-3">
      <AnalysisTimeoutBanner
        analyzePending={analyzePending}
        guardDisabled={guardDisabled}
        hasAnalysis={hasAnalysis}
        pollTimedOut={pollTimedOut}
        onRetry={onReanalyze}
      />
      <CompletedSessionStory
        isAnalyzing={isAnalyzing && !pollTimedOut}
        session={{
          ...session,
          analysis: analysis ?? session.analysis,
          analyzedAt: analyzedAt ?? session.analyzedAt,
        }}
        onReanalyze={onReanalyze}
      />
      {painReassessments.length > 0 ? (
        <div className="border-analysis-border/50 space-y-2 border-t pt-3">
          <p className="text-label text-signal-caution inline-flex items-center gap-1.5">
            <HeartPulse className="size-3.5 shrink-0" aria-hidden />
            Réévaluer une douleur ou blessure
          </p>
          {painReassessments.map((item) => (
            <PhysicalReassessmentCard key={item.noteId} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LinkedSessionRealization({
  linked,
  omitLinkedActivityNavigation,
  delink,
  analysisSection,
}: {
  linked: ClientActivity | null;
  omitLinkedActivityNavigation: boolean;
  delink: ReactNode;
  analysisSection: ReactNode;
}) {
  if (omitLinkedActivityNavigation) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">{delink}</div>
        {analysisSection}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {linked ? <LinkedActivityCard delink={delink} linked={linked} /> : null}
      {analysisSection}
    </div>
  );
}

function UnlinkedSessionRealization({
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
  return (
    <div className="border-analysis-border/60 bg-analysis-surface-alt/30 space-y-3 rounded-lg border border-dashed p-2.5 sm:p-3">
      {!pickerOpen ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Séance planifiée non rapprochée</p>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
            Associe-la à l&apos;activité réalisée pour comparer le plan au fait réel et lancer
            l&apos;analyse de conformité.
          </p>
          <Button size="sm" type="button" variant="outline" onClick={onPickerOpen}>
            <Link2 className="size-4" /> Associer une activité
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Choisis l&apos;activité qui correspond à cette séance planifiée :
          </p>
          {isLinking ? (
            <LinkAnalysisStatus phase="linking" />
          ) : isAnalyzing ? (
            <LinkAnalysisStatus phase="analyzing" />
          ) : (
            <>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                <ActivityPickerList candidates={candidates} session={session} onLink={onLink} />
              </div>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionRealization({
  session,
  omitLinkedActivityNavigation = false,
}: {
  session: ClientPlannedSession;
  omitLinkedActivityNavigation?: boolean;
}) {
  const { link } = usePlannedSessionMutations();
  const picker = useSessionRealizationPicker();
  const { isLinked, linked } = useSessionRealizationLinkedActivity(session);
  const candidates = useSessionRealizationCandidates({ session, showAll: picker.showAll });
  const analysisState = useSessionRealizationAnalysis({ session, isLinked });

  function handleLink(activityId: string) {
    link.mutate({ id: session.id, activityId });
    picker.closePicker();
  }

  if (!isLinked) {
    return (
      <UnlinkedSessionRealization
        candidates={candidates}
        isAnalyzing={analysisState.isAnalyzing}
        isLinking={link.isPending}
        pickerOpen={picker.pickerOpen}
        session={session}
        showAll={picker.showAll}
        onLink={handleLink}
        onPickerClose={picker.closePicker}
        onPickerOpen={picker.openPicker}
        onToggleShowAll={picker.toggleShowAll}
      />
    );
  }

  const delink = (
    <button
      className="text-muted-foreground hover:text-destructive flex shrink-0 items-center gap-1 text-xs"
      disabled={link.isPending}
      type="button"
      onClick={() => link.mutate({ id: session.id, activityId: null })}
    >
      <Unlink className="size-3" /> Délier
    </button>
  );

  const analysisSection = (
    <LinkedAnalysisSection
      analysis={analysisState.analysis}
      analyzedAt={analysisState.analyzedAt}
      analyzePending={analysisState.analyzePending}
      guardDisabled={analysisState.guardDisabled}
      isAnalyzing={analysisState.isAnalyzing}
      painReassessments={analysisState.painReassessments}
      pollTimedOut={analysisState.pollTimedOut}
      session={session}
      onReanalyze={() => void analysisState.handleManualAnalysis()}
    />
  );

  return (
    <LinkedSessionRealization
      analysisSection={analysisSection}
      delink={delink}
      linked={linked}
      omitLinkedActivityNavigation={omitLinkedActivityNavigation}
    />
  );
}

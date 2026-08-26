'use client';

import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { CompletedSessionStory } from '../read/completed-session-story';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { ClientActivity, ClientPhysicalNote, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { severityColor } from '@/lib/physical';
import { cn } from '@/lib/utils';
import type { SessionAnalysis } from '@/lib/validators/coach';
import { useActivities, usePlannedSessionMutations } from '@/hooks/use-data';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import { usePhysicalNoteMutations, usePhysicalNotes } from '@/hooks/use-physical';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { queryKeys } from '@/lib/query/keys';
import { fetchPlannedSessionById } from '@/lib/query/fetchers';
import { LinkAnalysisStatus } from '@/components/planning/session/link-analysis-status';
import {
  scorePlannedActivityMatch,
  formatActivityMatchLabel,
} from '@/lib/planned-session/linking/session-link-match-score';
import { Check, HeartPulse, Link2, Loader2, Unlink, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

const ANALYSIS_POLL_MS = 3_000;
const ANALYSIS_POLL_MAX_MS = 120_000;
const ANALYSIS_TIMEOUT_STORAGE_PREFIX = 'sharpit.analysis-poll-timeout.';

function analysisTimeoutStorageKey(sessionId: string): string {
  return `${ANALYSIS_TIMEOUT_STORAGE_PREFIX}${sessionId}`;
}

function readAnalysisPollTimedOut(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(analysisTimeoutStorageKey(sessionId)) === '1';
  } catch {
    return false;
  }
}

function writeAnalysisPollTimedOut(sessionId: string): void {
  try {
    sessionStorage.setItem(analysisTimeoutStorageKey(sessionId), '1');
  } catch {
    // ignore quota / private mode
  }
}

function clearAnalysisPollTimedOut(sessionId: string): void {
  try {
    sessionStorage.removeItem(analysisTimeoutStorageKey(sessionId));
  } catch {
    // ignore
  }
}

function activityMetric(a: ClientActivity): string {
  if (a.runMetrics?.distanceM) return formatDistance(a.runMetrics.distanceM);
  if (a.bikeMetrics?.avgPower) return `${Math.round(a.bikeMetrics.avgPower)} W`;
  if (a.swimMetrics?.distanceM) return formatDistance(a.swimMetrics.distanceM);
  return formatDuration(a.duration);
}

type PhysicalReassessment = NonNullable<SessionAnalysis['physicalReassessments']>[number];

/** Réévaluation déjà enregistrée via un point de suivi post-analyse. */
function isReassessmentAnswered(
  note: ClientPhysicalNote,
  analyzedAt: Date | null,
  sessionDate: Date,
): boolean {
  if (note.checkins.length === 0) return false;
  const since = analyzedAt ?? startOfDay(sessionDate);
  return note.checkins.some((c) => new Date(c.createdAt) >= since);
}

function PhysicalReassessmentCard({ item }: { item: PhysicalReassessment }) {
  const notesQuery = usePhysicalNotes();
  const { addCheckin } = usePhysicalNoteMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const note = notesQuery.data?.find((n) => n.id === item.noteId);

  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const [severity, setSeverity] = useState<number>(item.suggestedSeverity ?? note?.severity ?? 5);
  const [comment, setComment] = useState('');
  const contextHint = item.comment?.trim() || null;

  // Afficher uniquement les douleurs / blessures, pas posture ou mobilité.
  if (!note || dismissed || (note.category !== 'PAIN' && note.category !== 'INJURY')) return null;

  const isSaving = addCheckin.isPending;

  function handleSave() {
    if (guardDisabled) return;
    addCheckin.mutate(
      {
        id: item.noteId,
        data: { severity, comment: comment.trim() || null },
      },
      { onSuccess: () => setDone(true) },
    );
  }

  if (done) {
    return (
      <div className="border-primary/30 bg-primary/8 text-primary flex items-center gap-1.5 rounded-md border p-2 text-xs">
        <Check className="size-3.5 shrink-0" />
        <span>
          Suivi mis à jour : {item.noteTitle} ({severity}/10)
        </span>
      </div>
    );
  }

  return (
    <div className="border-analysis-border/60 bg-analysis-surface-alt/80 space-y-2 rounded-md border p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-card-title text-sm">{item.noteTitle}</p>
        <button
          aria-label="Ignorer"
          className="text-muted-foreground hover:text-foreground"
          type="button"
          onClick={() => setDismissed(true)}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-muted-foreground text-xs">{item.question}</p>
      {contextHint ? (
        <p className="text-muted-foreground/80 border-border/40 bg-muted/30 text-label rounded-md border px-2 py-1.5 leading-relaxed normal-case">
          Contexte séance : {contextHint}
        </p>
      ) : null}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sévérité ressentie</span>
          <span className={cn('text-data font-semibold', severityColor(severity))}>
            {severity}/10
          </span>
        </div>
        <input
          aria-label="Sévérité ressentie"
          aria-valuetext={`${severity} sur 10`}
          className="accent-primary w-full"
          max={10}
          min={0}
          step={1}
          type="range"
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
        />
      </div>
      <Textarea
        className="min-h-0 text-xs"
        placeholder="Ressenti pendant la séance…"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button disabled={guardDisabled || isSaving} size="sm" type="button" onClick={handleSave}>
        {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {offline ? offlineLabel : 'Enregistrer le point'}
      </Button>
    </div>
  );
}

export function SessionRealization({
  session,
  omitLinkedActivityNavigation = false,
}: {
  session: ClientPlannedSession;
  /** Hide link/card back to the realized activity (e.g. opened from activity detail). */
  omitLinkedActivityNavigation?: boolean;
}) {
  const queryClient = useQueryClient();
  const activitiesQuery = useActivities();
  const notesQuery = usePhysicalNotes();
  const { link, analyze } = usePlannedSessionMutations();
  const isDemo = useIsDemoMode();
  const { guardDisabled } = useOfflineGuard();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [polled, setPolled] = useState<{
    analysis: SessionAnalysis | null;
    analyzedAt: typeof session.analyzedAt;
  } | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(() => readAnalysisPollTimedOut(session.id));

  const analysis = polled?.analysis ?? (session.analysis as unknown as SessionAnalysis | null);
  const analyzedAt = polled?.analyzedAt ?? session.analyzedAt;

  const isLinked = Boolean(session.activityId);
  const linked =
    (session.activity?.type != null ? session.activity : null) ??
    (session.activityId
      ? (activitiesQuery.data?.find((item) => item.id === session.activityId) ?? null)
      : null);

  useEffect(() => {
    setPolled(null);
    setPollTimedOut(readAnalysisPollTimedOut(session.id));
  }, [session.id]);

  useEffect(() => {
    if (!session.analyzedAt) return;
    setPolled(null);
    clearAnalysisPollTimedOut(session.id);
    setPollTimedOut(false);
  }, [session.analyzedAt, session.id]);

  const hasAnalysis = Boolean(analysis && analyzedAt);
  const isPendingScheduled = Boolean(
    !isDemo && isLinked && !hasAnalysis && !analyze.isPending && !pollTimedOut,
  );

  // Kick a client analyze once if still missing after remount (server `after` may have been killed).
  useEffect(() => {
    if (isDemo || !isLinked || hasAnalysis || pollTimedOut || analyze.isPending) return;
    const kickKey = `sharpit.analysis-kick.${session.id}`;
    try {
      if (sessionStorage.getItem(kickKey) === '1') return;
      sessionStorage.setItem(kickKey, '1');
    } catch {
      // still attempt once per mount via analyze below
    }
    analyze.mutate(session.id);
  }, [analyze, hasAnalysis, isDemo, isLinked, pollTimedOut, session.id]);

  useEffect(() => {
    if (!isPendingScheduled) return;

    const startedAt = Date.now();
    let cancelled = false;

    async function poll() {
      while (!cancelled && Date.now() - startedAt < ANALYSIS_POLL_MAX_MS) {
        await new Promise((resolve) => setTimeout(resolve, ANALYSIS_POLL_MS));
        if (cancelled) return;

        try {
          // Poll the single session — avoid refetching the full plannedSessions list.
          const updated = await fetchPlannedSessionById(session.id);
          if (updated.analyzedAt && updated.analysis) {
            setPolled({
              analysis: updated.analysis as unknown as SessionAnalysis,
              analyzedAt: updated.analyzedAt,
            });
            clearAnalysisPollTimedOut(session.id);
            setPollTimedOut(false);
            queryClient.setQueryData(
              queryKeys.plannedSessions,
              (prev: ClientPlannedSession[] | undefined) => {
                if (!prev) return prev;
                return prev.map((item) =>
                  item.id === updated.id
                    ? {
                        ...item,
                        analysis: updated.analysis,
                        analyzedAt: updated.analyzedAt,
                      }
                    : item,
                );
              },
            );
            return;
          }
        } catch {
          // best-effort polling
        }
      }

      if (!cancelled) {
        writeAnalysisPollTimedOut(session.id);
        setPollTimedOut(true);
        try {
          sessionStorage.removeItem(`sharpit.analysis-kick.${session.id}`);
        } catch {
          // ignore
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [isPendingScheduled, queryClient, session.id]);

  const painReassessments = useMemo(() => {
    const notes = notesQuery.data ?? [];
    const analyzedAt = session.analyzedAt ? new Date(session.analyzedAt) : null;
    const sessionDate = new Date(session.date);
    return (analysis?.physicalReassessments ?? []).filter((item) => {
      const note = notes.find((n) => n.id === item.noteId);
      if (!note || (note.category !== 'PAIN' && note.category !== 'INJURY')) return false;
      if (isReassessmentAnswered(note, analyzedAt, sessionDate)) return false;
      return true;
    });
  }, [analysis?.physicalReassessments, notesQuery.data, session.analyzedAt, session.date]);

  const candidates = useMemo(() => {
    const all = activitiesQuery.data ?? [];
    const scored = all
      // An activity realizes a planned session it was scheduled to answer to —
      // never one still ahead of it. A negative diff means the plan is for a
      // day after the activity, which the athlete hasn't reached yet.
      .filter((a) => differenceInCalendarDays(a.date, session.date) >= 0)
      .map((a) => ({
        a,
        diff: differenceInCalendarDays(a.date, session.date),
        sameType: a.type === session.type,
        score: scorePlannedActivityMatch(
          { date: session.date, durationMin: session.durationMin },
          { date: a.date, duration: a.duration },
        ),
      }))
      .sort((x, y) => {
        if (x.sameType !== y.sameType) return x.sameType ? -1 : 1;
        if (x.score !== y.score) return y.score - x.score;
        return x.diff - y.diff;
      });
    if (showAll) return scored.slice(0, 30);
    return scored.filter((s) => s.sameType && s.diff <= 3).slice(0, 8);
  }, [activitiesQuery.data, session.date, session.durationMin, session.type, showAll]);

  const isLinking = link.isPending;
  const isAnalyzing = isDemo ? isLinked && !hasAnalysis : analyze.isPending || isPendingScheduled;

  function handleLink(activityId: string) {
    link.mutate({ id: session.id, activityId });
    setPickerOpen(false);
  }

  async function handleManualAnalysis() {
    if (guardDisabled) return;
    clearAnalysisPollTimedOut(session.id);
    setPollTimedOut(false);
    try {
      sessionStorage.removeItem(`sharpit.analysis-kick.${session.id}`);
    } catch {
      // ignore
    }
    const loadingToast = toast.loading('Analyse de la séance en cours');
    try {
      await analyze.mutateAsync(session.id);
    } finally {
      toast.close(loadingToast);
    }
  }

  function renderAnalysisTimeoutBanner() {
    if (!pollTimedOut || hasAnalysis) return null;

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
          disabled={guardDisabled || analyze.isPending}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void handleManualAnalysis()}
        >
          Relancer l&apos;analyse
        </Button>
      </div>
    );
  }

  function renderLinkedActivityCard(delink: ReactNode) {
    if (!linked) return null;

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

  function renderLinkedAnalysisSection() {
    return (
      <div className="space-y-3">
        {renderAnalysisTimeoutBanner()}
        <CompletedSessionStory
          isAnalyzing={isAnalyzing && !pollTimedOut}
          session={{
            ...session,
            analysis: analysis ?? session.analysis,
            analyzedAt: analyzedAt ?? session.analyzedAt,
          }}
          onReanalyze={() => void handleManualAnalysis()}
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

  function renderActivityPickerBody() {
    if (isLinking) return <LinkAnalysisStatus phase="linking" />;
    if (isAnalyzing) return <LinkAnalysisStatus phase="analyzing" />;

    return (
      <>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {candidates.length === 0 && (
            <p className="text-muted-foreground py-2 text-center text-xs">
              Aucune activité trouvée.{' '}
              <Link className="text-primary hover:underline" href="/settings/integrations">
                Synchronise Strava
              </Link>{' '}
              puis réessaie.
            </p>
          )}
          {candidates.map(({ a, diff, sameType }) => (
            <button
              key={a.id}
              className="border-analysis-border/60 bg-analysis-surface-alt/70 hover:border-primary/40 flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left"
              type="button"
              onClick={() => handleLink(a.id)}
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
        </div>
        <div className="flex items-center justify-between">
          <button
            className="text-muted-foreground hover:text-foreground text-xs"
            type="button"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Activités proches' : 'Voir toutes les activités'}
          </button>
          <button
            className="text-muted-foreground hover:text-foreground text-xs"
            type="button"
            onClick={() => setPickerOpen(false)}
          >
            Annuler
          </button>
        </div>
      </>
    );
  }

  if (isLinked) {
    const delink = (
      <button
        className="text-muted-foreground hover:text-destructive flex shrink-0 items-center gap-1 text-xs"
        disabled={isLinking}
        type="button"
        onClick={() => link.mutate({ id: session.id, activityId: null })}
      >
        <Unlink className="size-3" /> Délier
      </button>
    );

    if (omitLinkedActivityNavigation) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-end">{delink}</div>
          {renderLinkedAnalysisSection()}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {renderLinkedActivityCard(delink)}
        {renderLinkedAnalysisSection()}
      </div>
    );
  }

  return (
    <div className="border-analysis-border/60 bg-analysis-surface-alt/30 space-y-3 rounded-lg border border-dashed p-2.5 sm:p-3">
      {!pickerOpen ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Séance planifiée non rapprochée</p>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
            Associe-la à l&apos;activité réalisée pour comparer le plan au fait réel et lancer
            l&apos;analyse de conformité.
          </p>
          <Button size="sm" type="button" variant="outline" onClick={() => setPickerOpen(true)}>
            <Link2 className="size-4" /> Associer une activité
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Choisis l&apos;activité qui correspond à cette séance planifiée :
          </p>
          {renderActivityPickerBody()}
        </div>
      )}
    </div>
  );
}

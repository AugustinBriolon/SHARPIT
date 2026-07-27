'use client';

import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { CompletedSessionStory } from '@/components/planning/session/completed-session-story';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { ClientActivity, ClientPhysicalNote, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { severityColor } from '@/lib/physical';
import { cn } from '@/lib/utils';
import type { SessionAnalysis } from '@/lib/validators/coach';
import { useActivities, usePlannedSessionMutations } from '@/hooks/use-data';
import { usePhysicalNoteMutations, usePhysicalNotes } from '@/hooks/use-physical';
import { queryKeys } from '@/lib/query/keys';
import { fetchPlannedSessions } from '@/lib/query/fetchers';
import { Check, CheckCircle2, HeartPulse, Link2, Loader2, Unlink, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
        <p className="text-xs font-medium">{item.noteTitle}</p>
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
      {contextHint && (
        <p className="text-muted-foreground/80 border-border/40 bg-muted/30 rounded-md border px-2 py-1.5 text-[11px] leading-relaxed">
          Contexte séance : {contextHint}
        </p>
      )}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sévérité ressentie</span>
          <span className={cn('font-mono font-semibold', severityColor(severity))}>
            {severity}/10
          </span>
        </div>
        <input
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
      <Button disabled={isSaving} size="sm" type="button" onClick={handleSave}>
        {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        Enregistrer le point
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [analysis, setAnalysis] = useState(session.analysis as unknown as SessionAnalysis | null);
  const [analyzedAt, setAnalyzedAt] = useState(session.analyzedAt);
  const [pollTimedOut, setPollTimedOut] = useState(() => readAnalysisPollTimedOut(session.id));

  const isLinked = Boolean(session.activityId);
  const linked =
    (session.activity?.type != null ? session.activity : null) ??
    (session.activityId
      ? (activitiesQuery.data?.find((item) => item.id === session.activityId) ?? null)
      : null);

  useEffect(() => {
    setAnalysis(session.analysis as unknown as SessionAnalysis | null);
    setAnalyzedAt(session.analyzedAt);
    if (session.analyzedAt) {
      clearAnalysisPollTimedOut(session.id);
      setPollTimedOut(false);
    } else {
      setPollTimedOut(readAnalysisPollTimedOut(session.id));
    }
  }, [session.analysis, session.analyzedAt, session.id, session.activityId]);

  const hasAnalysis = Boolean(analysis && analyzedAt);
  const isPendingScheduled = Boolean(
    isLinked && !hasAnalysis && !analyze.isPending && !pollTimedOut,
  );

  // Kick a client analyze once if still missing after remount (server `after` may have been killed).
  useEffect(() => {
    if (!isLinked || hasAnalysis || pollTimedOut || analyze.isPending) return;
    const kickKey = `sharpit.analysis-kick.${session.id}`;
    try {
      if (sessionStorage.getItem(kickKey) === '1') return;
      sessionStorage.setItem(kickKey, '1');
    } catch {
      // still attempt once per mount via analyze below
    }
    analyze.mutate(session.id);
  }, [analyze, hasAnalysis, isLinked, pollTimedOut, session.id]);

  useEffect(() => {
    if (!isPendingScheduled) return;

    const startedAt = Date.now();
    let cancelled = false;

    async function poll() {
      while (!cancelled && Date.now() - startedAt < ANALYSIS_POLL_MAX_MS) {
        await new Promise((resolve) => setTimeout(resolve, ANALYSIS_POLL_MS));
        if (cancelled) return;

        try {
          const sessions = await queryClient.fetchQuery({
            queryKey: queryKeys.plannedSessions,
            queryFn: fetchPlannedSessions,
            staleTime: 0,
          });
          const updated = sessions.find((item) => item.id === session.id);
          if (updated?.analyzedAt && updated.analysis) {
            setAnalysis(updated.analysis as unknown as SessionAnalysis);
            setAnalyzedAt(updated.analyzedAt);
            clearAnalysisPollTimedOut(session.id);
            setPollTimedOut(false);
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
      .map((a) => ({
        a,
        diff: Math.abs(differenceInCalendarDays(a.date, session.date)),
        sameType: a.type === session.type,
      }))
      .sort((x, y) => {
        if (x.sameType !== y.sameType) return x.sameType ? -1 : 1;
        return x.diff - y.diff;
      });
    if (showAll) return scored.slice(0, 30);
    return scored.filter((s) => s.sameType && s.diff <= 3).slice(0, 8);
  }, [activitiesQuery.data, session.date, session.type, showAll]);

  const isLinking = link.isPending;
  const isAnalyzing = analyze.isPending || isPendingScheduled;

  function handleLink(activityId: string) {
    link.mutate({ id: session.id, activityId });
    setPickerOpen(false);
  }

  async function handleManualAnalysis() {
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
      toast.success('Analyse de la séance terminée');
    } finally {
      toast.close(loadingToast);
    }
  }

  function renderLinkedAnalysisSection() {
    return (
      <div className="space-y-3">
        <CompletedSessionStory
          isAnalyzing={isAnalyzing || isPendingScheduled}
          session={{
            ...session,
            analysis: analysis ?? session.analysis,
            analyzedAt: analyzedAt ?? session.analyzedAt,
          }}
          onReanalyze={() => void handleManualAnalysis()}
        />
        {painReassessments.length > 0 ? (
          <div className="border-signal-caution/20 bg-signal-caution/5 space-y-2 rounded-md border p-2.5">
            <p className="text-signal-caution flex items-center gap-1.5 text-xs font-medium">
              <HeartPulse className="size-3.5" />
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
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="text-primary size-3.5" />
            Liée à une activité
          </span>
          {delink}
        </div>

        {linked ? (
          <Link
            className="border-analysis-border/60 hover:border-primary/40 chip-surface flex items-center justify-between gap-2 rounded-lg px-3 py-2.5"
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
            <span className="text-muted-foreground shrink-0 text-xs font-medium">
              {activityMetric(linked)} →
            </span>
          </Link>
        ) : null}

        {renderLinkedAnalysisSection()}
      </div>
    );
  }

  return (
    <div className="border-border/60 space-y-2 rounded-lg border border-dashed p-2.5 sm:space-y-3 sm:p-3">
      {!pickerOpen ? (
        <Button size="sm" type="button" variant="outline" onClick={() => setPickerOpen(true)}>
          <Link2 className="size-4" /> J&apos;ai fait cette séance
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            {isLinking
              ? 'Liaison et analyse en cours…'
              : "Choisis l'activité réalisée correspondante :"}
          </p>
          {isLinking ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="text-primary size-5 animate-spin" />
            </div>
          ) : (
            <>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {candidates.length === 0 && (
                  <p className="text-muted-foreground py-2 text-center text-xs">
                    Aucune activité trouvée. Synchronise Strava puis réessaie.
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
          )}
        </div>
      )}
    </div>
  );
}

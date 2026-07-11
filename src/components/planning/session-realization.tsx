'use client';

import { differenceInCalendarDays, startOfDay } from 'date-fns';
import {
  Check,
  CheckCircle2,
  HeartPulse,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Unlink,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Textarea } from '@/components/ui/textarea';
import type { ClientActivity, ClientPhysicalNote, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { severityColor } from '@/lib/physical';
import { cn } from '@/lib/utils';
import type { SessionAnalysis } from '@/lib/validators/coach';
import { useActivities, usePlannedSessionMutations } from '@/hooks/use-data';
import { usePhysicalNoteMutations, usePhysicalNotes } from '@/hooks/use-physical';

const VERDICT_LABELS: Record<SessionAnalysis['verdict'], string> = {
  AS_PLANNED: 'Conforme',
  HARDER: 'Plus dur que prévu',
  EASIER: 'Plus facile que prévu',
  SHORTER: 'Plus court',
  LONGER: 'Plus long',
  DIFFERENT: 'Différent',
};

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
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
      <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-600">
        <Check className="size-3.5 shrink-0" />
        <span>
          Suivi mis à jour : {item.noteTitle} ({severity}/10)
        </span>
      </div>
    );
  }

  return (
    <div className="border-border/50 bg-card/50 space-y-2 rounded-md border p-2.5">
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

export function SessionRealization({ session }: { session: ClientPlannedSession }) {
  const activitiesQuery = useActivities();
  const notesQuery = usePhysicalNotes();
  const { link, analyze } = usePlannedSessionMutations();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const linked = session.activity;
  const analysis = session.analysis as unknown as SessionAnalysis | null;

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
  const isAnalyzing = analyze.isPending;

  function handleLink(activityId: string) {
    link.mutate({ id: session.id, activityId });
    setPickerOpen(false);
  }

  if (linked) {
    return (
      <div className="border-border/60 bg-card/30 space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-emerald-600 uppercase">
            <CheckCircle2 className="size-3.5" /> Séance réalisée
          </span>
          <button
            className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs"
            disabled={isLinking}
            type="button"
            onClick={() => link.mutate({ id: session.id, activityId: null })}
          >
            <Unlink className="size-3" /> Délier
          </button>
        </div>

        <Link
          className="border-border/50 bg-card/60 hover:border-primary/40 flex items-center justify-between gap-2 rounded-md border p-2"
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
            {activityMetric(linked)}
          </span>
        </Link>

        {analysis ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'font-mono text-2xl font-semibold',
                  scoreColor(analysis.complianceScore),
                )}
              >
                {analysis.complianceScore}
              </span>
              <span className="text-muted-foreground text-xs">/100</span>
              <span className="bg-muted/60 ml-auto rounded-full px-2 py-0.5 text-xs">
                {VERDICT_LABELS[analysis.verdict]}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{analysis.summary}</p>
            {analysis.remarks.length > 0 && (
              <ul className="space-y-1">
                {analysis.remarks.map((r, i) => (
                  <li key={i} className="text-muted-foreground flex gap-1.5 text-xs">
                    <span className="text-primary">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
            {analysis.recommendation && (
              <p className="border-primary/20 bg-primary/5 rounded-md border p-2 text-xs">
                💡 {analysis.recommendation}
              </p>
            )}
            <LinkButton href={`/coach?discuss=${session.id}`} size="sm" variant="outline">
              <MessageCircle className="size-3.5" />
              Discuter avec le coach
            </LinkButton>
            {painReassessments.length > 0 && (
              <div className="space-y-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <HeartPulse className="size-3.5" />
                  Réévaluer une douleur ou blessure
                </p>
                {painReassessments.map((item) => (
                  <PhysicalReassessmentCard key={item.noteId} item={item} />
                ))}
              </div>
            )}
            <button
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
              disabled={isAnalyzing}
              type="button"
              onClick={() => analyze.mutate(session.id)}
            >
              {isAnalyzing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Ré-analyser
            </button>
          </div>
        ) : (
          <Button
            disabled={isAnalyzing}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => analyze.mutate(session.id)}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Analyse…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Analyser la séance
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border-border/60 space-y-3 rounded-lg border border-dashed p-3">
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
                    className="border-border/50 bg-card/40 hover:border-primary/40 flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left"
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

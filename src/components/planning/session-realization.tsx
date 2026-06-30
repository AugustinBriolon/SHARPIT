"use client";

import { differenceInCalendarDays } from "date-fns";
import {
  Check,
  CheckCircle2,
  HeartPulse,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Unlink,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ClientActivity, ClientPlannedSession } from "@/lib/client/types";
import {
  activityTypeColors,
  activityTypeLabels,
  formatDate,
  formatDistance,
  formatDuration,
} from "@/lib/format";
import { severityColor } from "@/lib/physical";
import { cn } from "@/lib/utils";
import type { SessionAnalysis } from "@/lib/validators/coach";
import { useActivities, usePlannedSessionMutations } from "@/hooks/use-data";
import {
  usePhysicalNoteMutations,
  usePhysicalNotes,
} from "@/hooks/use-physical";

const VERDICT_LABELS: Record<SessionAnalysis["verdict"], string> = {
  AS_PLANNED: "Conforme",
  HARDER: "Plus dur que prévu",
  EASIER: "Plus facile que prévu",
  SHORTER: "Plus court",
  LONGER: "Plus long",
  DIFFERENT: "Différent",
};

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function activityMetric(a: ClientActivity): string {
  if (a.runMetrics?.distanceM) return formatDistance(a.runMetrics.distanceM);
  if (a.bikeMetrics?.avgPower)
    return `${Math.round(a.bikeMetrics.avgPower)} W`;
  if (a.swimMetrics?.distanceM) return formatDistance(a.swimMetrics.distanceM);
  return formatDuration(a.duration);
}

type PhysicalReassessment = NonNullable<
  SessionAnalysis["physicalReassessments"]
>[number];

function PhysicalReassessmentCard({ item }: { item: PhysicalReassessment }) {
  const notesQuery = usePhysicalNotes();
  const { addCheckin } = usePhysicalNoteMutations();
  const note = notesQuery.data?.find((n) => n.id === item.noteId);

  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const [severity, setSeverity] = useState<number>(
    item.suggestedSeverity ?? note?.severity ?? 5,
  );
  const [comment, setComment] = useState(item.comment ?? "");

  // La note peut avoir été résolue/supprimée depuis l'analyse, ou l'id être
  // invalide : on n'affiche rien dans ce cas.
  if (!note || dismissed) return null;

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
    <div className="space-y-2 rounded-md border border-border/50 bg-card/50 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium">{item.noteTitle}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Ignorer"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{item.question}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sévérité ressentie</span>
          <span className={cn("font-mono font-semibold", severityColor(severity))}>
            {severity}/10
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Ressenti pendant la séance…"
        className="min-h-0 text-xs"
      />
      <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        Enregistrer le point
      </Button>
    </div>
  );
}

export function SessionRealization({
  session,
}: {
  session: ClientPlannedSession;
}) {
  const activitiesQuery = useActivities();
  const { link, analyze } = usePlannedSessionMutations();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const linked = session.activity;
  const analysis = session.analysis as unknown as SessionAnalysis | null;

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
      <div className="space-y-3 rounded-lg border border-border/60 bg-card/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-600">
            <CheckCircle2 className="size-3.5" /> Séance réalisée
          </span>
          <button
            type="button"
            onClick={() => link.mutate({ id: session.id, activityId: null })}
            disabled={isLinking}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Unlink className="size-3" /> Délier
          </button>
        </div>

        <Link
          href={`/training/${linked.id}`}
          className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card/60 p-2 hover:border-primary/40"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {linked.title ?? activityTypeLabels[linked.type]}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(linked.date)} · {formatDuration(linked.duration)}
            </p>
          </div>
          <span
            className={cn("text-xs font-medium", activityTypeColors[linked.type])}
          >
            {activityMetric(linked)}
          </span>
        </Link>

        {analysis ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-mono text-2xl font-semibold",
                  scoreColor(analysis.complianceScore),
                )}
              >
                {analysis.complianceScore}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
              <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-xs">
                {VERDICT_LABELS[analysis.verdict]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            {analysis.remarks.length > 0 && (
              <ul className="space-y-1">
                {analysis.remarks.map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="text-primary">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
            {analysis.recommendation && (
              <p className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">
                💡 {analysis.recommendation}
              </p>
            )}
            {(analysis.physicalReassessments?.length ?? 0) > 0 && (
              <div className="space-y-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <HeartPulse className="size-3.5" />
                  Réévaluer ton suivi physique
                </p>
                {analysis.physicalReassessments?.map((item) => (
                  <PhysicalReassessmentCard key={item.noteId} item={item} />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => analyze.mutate(session.id)}
              disabled={isAnalyzing}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
            type="button"
            variant="outline"
            size="sm"
            onClick={() => analyze.mutate(session.id)}
            disabled={isAnalyzing}
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
    <div className="space-y-3 rounded-lg border border-dashed border-border/60 p-3">
      {!pickerOpen ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
        >
          <Link2 className="size-4" /> J&apos;ai fait cette séance
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {isLinking
              ? "Liaison et analyse en cours…"
              : "Choisis l'activité réalisée correspondante :"}
          </p>
          {isLinking ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {candidates.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Aucune activité trouvée. Synchronise Strava puis réessaie.
                  </p>
                )}
                {candidates.map(({ a, diff, sameType }) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleLink(a.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border/50 bg-card/40 p-2 text-left hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {a.title ?? activityTypeLabels[a.type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.date)} · {formatDuration(a.duration)}
                        {diff === 0 && sameType ? " · même jour" : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        activityTypeColors[a.type],
                      )}
                    >
                      {activityTypeLabels[a.type]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showAll ? "Activités proches" : "Voir toutes les activités"}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
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

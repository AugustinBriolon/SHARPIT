"use client";

import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Plus, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PlanAdapter } from "@/components/coach/plan-adapter";
import { PlanGenerator } from "@/components/coach/plan-generator";
import { PlannedSessionDialog } from "@/components/planning/planned-session-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientPlannedSession } from "@/lib/client/types";
import { activityTypeColors, activityTypeLabels } from "@/lib/format";
import { buildPlanningWeeks, type PlanningWeek } from "@/lib/planning";
import { intensityAccent, formatPlannedDuration } from "@/lib/sessions";
import { cn } from "@/lib/utils";
import {
  useActivities,
  useGoals,
  usePlannedSessions,
} from "@/hooks/use-data";

type DialogState =
  | { mode: "create"; date: Date }
  | { mode: "edit"; session: ClientPlannedSession }
  | null;

export function PlanningView() {
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);

  if (
    activitiesQuery.isLoading ||
    plannedQuery.isLoading ||
    goalsQuery.isLoading
  ) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const nextRace = (goalsQuery.data ?? [])
    .flatMap((g) =>
      g.kind === "RACE" && !g.achieved && g.targetDate != null
        ? [{ goal: g, target: new Date(g.targetDate) }]
        : [],
    )
    .filter(({ target }) => target >= new Date())
    .sort((a, b) => a.target.getTime() - b.target.getTime())[0];

  const weeks = buildPlanningWeeks(
    activitiesQuery.data ?? [],
    plannedQuery.data ?? [],
    nextRace?.target ?? null,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Planning
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            Plan d&apos;entraînement
          </h1>
          <p className="mt-1 text-muted-foreground">
            {nextRace
              ? `Objectif : ${nextRace.goal.title} — ${format(nextRace.target, "d MMMM yyyy", { locale: fr })}`
              : "Construis tes semaines d'entraînement."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAdapterOpen(true)}>
            <Wand2 className="size-4" />
            Réadapter
          </Button>
          <Button variant="outline" onClick={() => setGeneratorOpen(true)}>
            <Sparkles className="size-4" />
            Générer ma semaine
          </Button>
          <Button onClick={() => setDialog({ mode: "create", date: new Date() })}>
            <Plus className="size-4" />
            Planifier une séance
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        {weeks.map((week) => (
          <WeekCard
            key={week.start.toISOString()}
            week={week}
            onAdd={(date) => setDialog({ mode: "create", date })}
            onEdit={(session) => setDialog({ mode: "edit", session })}
          />
        ))}
      </div>

      {dialog && (
        <PlannedSessionDialog
          goals={goalsQuery.data ?? []}
          session={dialog.mode === "edit" ? dialog.session : undefined}
          defaultDate={dialog.mode === "create" ? dialog.date : undefined}
          onClose={() => setDialog(null)}
        />
      )}

      {generatorOpen && (
        <PlanGenerator onClose={() => setGeneratorOpen(false)} />
      )}

      {adapterOpen && <PlanAdapter onClose={() => setAdapterOpen(false)} />}
    </div>
  );
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function WeekCard({
  week,
  onAdd,
  onEdit,
}: {
  week: PlanningWeek;
  onAdd: (date: Date) => void;
  onEdit: (session: ClientPlannedSession) => void;
}) {
  const isCurrent = week.index === 0;
  const ratio =
    week.plannedLoad > 0
      ? Math.min(100, Math.round((week.actualLoad / week.plannedLoad) * 100))
      : 0;

  const days = DAY_LABELS.map((label, i) => {
    const date = new Date(week.start);
    date.setDate(date.getDate() + i);
    const planned = week.planned.filter((p) => isSameDay(new Date(p.date), date));
    const activities = week.activities.filter((a) =>
      isSameDay(new Date(a.date), date),
    );
    return { label, date, planned, activities };
  });

  return (
    <Card className={cn(isCurrent && "border-primary/40")}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-base font-medium">
            Semaine du {format(week.start, "d MMM", { locale: fr })}
          </h2>
          {isCurrent && <Badge variant="outline">En cours</Badge>}
          {week.weeksToRace != null && week.weeksToRace >= 0 && (
            <Badge variant="outline" className="text-primary">
              {week.weeksToRace === 0 ? "Semaine course" : `S-${week.weeksToRace}`}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-sm">
              <span className="text-muted-foreground">Prévu</span>{" "}
              <span className="text-cyan-400">{week.plannedLoad}</span>
              <span className="mx-1 text-muted-foreground">·</span>
              <span className="text-muted-foreground">Réalisé</span>{" "}
              <span className="text-orange-400">{week.actualLoad}</span>
            </p>
            <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-orange-400/80"
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {days.map((day) => (
            <div
              key={day.label}
              className="rounded-lg border border-border/40 bg-card/30 p-2"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {day.label} {day.date.getDate()}
                </span>
                <button
                  type="button"
                  onClick={() => onAdd(day.date)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Ajouter une séance"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="space-y-1">
                {day.planned.map((p) => {
                  const accent = p.intensity
                    ? intensityAccent[p.intensity]
                    : "#94a3b8";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onEdit(p)}
                      style={{ borderColor: accent }}
                      className={cn(
                        "block w-full truncate rounded-md border border-dashed px-1.5 py-1 text-left text-[11px] hover:bg-muted/40",
                        p.completed && "opacity-50",
                      )}
                      title={p.description ?? undefined}
                    >
                      <span className="flex items-center gap-1">
                        {p.completed ? (
                          <CheckCircle2 className="size-2.5 shrink-0 text-emerald-400" />
                        ) : (
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: accent }}
                          />
                        )}
                        <span className="truncate">
                          {p.title ?? activityTypeLabels[p.type]}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                        <span>
                          {p.startTime ? `${p.startTime} · ` : ""}
                          {formatPlannedDuration(p.durationMin)}
                        </span>
                        {(() => {
                          const score = (
                            p.analysis as { complianceScore?: number } | null
                          )?.complianceScore;
                          return score != null ? (
                            <span
                              className={cn(
                                "font-mono",
                                score >= 85
                                  ? "text-emerald-400"
                                  : score >= 60
                                    ? "text-amber-400"
                                    : "text-red-400",
                              )}
                            >
                              {score}
                            </span>
                          ) : null;
                        })()}
                      </span>
                    </button>
                  );
                })}
                {day.activities.map((a) => (
                  <Link
                    key={a.id}
                    href={`/training/${a.id}`}
                    className={cn(
                      "block truncate rounded-md border border-border/60 bg-card/80 px-1.5 py-0.5 text-[11px] font-medium hover:border-primary/40",
                      activityTypeColors[a.type],
                    )}
                    title={a.title ?? activityTypeLabels[a.type]}
                  >
                    ✓ {a.title ?? activityTypeLabels[a.type]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

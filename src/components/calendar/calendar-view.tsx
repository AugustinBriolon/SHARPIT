"use client";

import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PlannedSessionDialog } from "@/components/planning/planned-session-dialog";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCalendarMonth, weekDayLabels } from "@/lib/calendar";
import type { ClientActivity, ClientPlannedSession } from "@/lib/client/types";
import { activityTypeColors, activityTypeLabels } from "@/lib/format";
import { intensityAccent } from "@/lib/sessions";
import { cn } from "@/lib/utils";
import {
  useActivities,
  useGoals,
  usePlannedSessions,
  usePlannedSessionMutations,
} from "@/hooks/use-data";

type DialogState =
  | { mode: "create"; date: Date }
  | { mode: "edit"; session: ClientPlannedSession }
  | null;

export function CalendarView() {
  // `mounted` évite le décalage d'hydratation : le mois n'est rendu que côté client.
  const mounted = useMounted();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));

  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const { update } = usePlannedSessionMutations();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Calendar
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold capitalize tracking-tight">
          {mounted ? format(month, "MMMM yyyy", { locale: fr }) : "Calendrier"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Séances réalisées et planifiées. Glisse une séance prévue pour la
          déplacer.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Mois précédent"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          disabled={!mounted}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonth(startOfMonth(new Date()))}
          disabled={!mounted}
        >
          Aujourd&apos;hui
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Mois suivant"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={!mounted}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          onClick={() => setDialog({ mode: "create", date: new Date() })}
          disabled={!mounted}
        >
          <Plus className="size-4" />
          Planifier
        </Button>
      </div>
    </header>
  );

  if (
    !mounted ||
    activitiesQuery.isLoading ||
    plannedQuery.isLoading ||
    goalsQuery.isLoading
  ) {
    return (
      <div className="space-y-8">
        {header}
        <Skeleton className="h-[560px] w-full" />
      </div>
    );
  }

  const weeks = buildCalendarMonth(
    month,
    activitiesQuery.data ?? [],
    plannedQuery.data ?? [],
  );

  async function handleDrop(dateKey: string, targetDate: Date) {
    setDragOver(null);
    const raw = dragData;
    if (!raw) return;
    const session = (plannedQuery.data ?? []).find((s) => s.id === raw);
    if (!session) return;
    if (format(new Date(session.date), "yyyy-MM-dd") === dateKey) return;
    await update.mutateAsync({
      id: session.id,
      data: { date: targetDate },
    });
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="grid grid-cols-7 border-b border-border/60 bg-card/40">
          {weekDayLabels.map((d) => (
            <div
              key={d}
              className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((cell) => {
            const dateKey = format(cell.date, "yyyy-MM-dd");
            return (
              <div
                key={dateKey}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(dateKey);
                }}
                onDragLeave={() =>
                  setDragOver((k) => (k === dateKey ? null : k))
                }
                onDrop={() => handleDrop(dateKey, cell.date)}
                onClick={() => setDialog({ mode: "create", date: cell.date })}
                className={cn(
                  "min-h-28 cursor-pointer border-b border-r border-border/40 p-1.5 transition-colors last:border-r-0",
                  !cell.inMonth && "bg-muted/20",
                  dragOver === dateKey && "bg-primary/10",
                )}
              >
                <div className="mb-1 flex items-center justify-between px-1">
                  <span
                    className={cn(
                      "text-xs",
                      cell.isToday
                        ? "flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
                        : cell.inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  {cell.activities.map((a) => (
                    <ActivityChip key={a.id} activity={a} />
                  ))}
                  {cell.planned.map((p) => (
                    <PlannedChip
                      key={p.id}
                      session={p}
                      onEdit={() => setDialog({ mode: "edit", session: p })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dialog && (
        <PlannedSessionDialog
          goals={goalsQuery.data ?? []}
          session={dialog.mode === "edit" ? dialog.session : undefined}
          defaultDate={dialog.mode === "create" ? dialog.date : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// Variable module-level pour transporter l'id en drag natif (dataTransfer est
// indisponible pendant dragOver sur certains navigateurs).
let dragData: string | null = null;

function ActivityChip({ activity }: { activity: ClientActivity }) {
  return (
    <Link
      href={`/training/${activity.id}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "block truncate rounded-md border border-border/60 bg-card/80 px-1.5 py-0.5 text-[11px] font-medium hover:border-primary/40",
        activityTypeColors[activity.type],
      )}
      title={activity.title ?? activityTypeLabels[activity.type]}
    >
      {activity.title ?? activityTypeLabels[activity.type]}
    </Link>
  );
}

function PlannedChip({
  session,
  onEdit,
}: {
  session: ClientPlannedSession;
  onEdit: () => void;
}) {
  const accent = session.intensity
    ? intensityAccent[session.intensity]
    : "#94a3b8";
  return (
    <button
      type="button"
      draggable
      onDragStart={() => {
        dragData = session.id;
      }}
      onDragEnd={() => {
        dragData = null;
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      style={{ borderColor: accent }}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded-md border border-dashed bg-transparent px-1.5 py-0.5 text-left text-[11px] hover:bg-muted/40",
        session.completed && "opacity-50",
      )}
      title={session.title ?? activityTypeLabels[session.type]}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <span className="truncate text-muted-foreground">
        {session.title ?? activityTypeLabels[session.type]}
      </span>
    </button>
  );
}

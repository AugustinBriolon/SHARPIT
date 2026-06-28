"use client";

import { GoalKind } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { queryKeys } from "@/lib/client/keys";
import {
  computeGoalProgress,
  daysUntil,
  formatRemaining,
  horizonLabels,
} from "@/lib/goals";

export interface GoalItem {
  id: string;
  title: string;
  kind: GoalKind;
  horizon: keyof typeof horizonLabels | null;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  lowerIsBetter: boolean;
  targetDate: string | Date | null;
  location: string | null;
  achieved: boolean;
  notes: string | null;
}

function formatValue(value: number | null, unit: string | null) {
  if (value == null) return "—";
  return unit ? `${value} ${unit}` : String(value);
}

export function RaceCard({ goal }: { goal: GoalItem }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const date = goal.targetDate ? new Date(goal.targetDate) : null;
  const days = daysUntil(date);
  const dateLabel = date
    ? new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date)
    : null;

  async function handleDelete() {
    if (!confirm(`Supprimer « ${goal.title} » ?`)) return;
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    router.refresh();
  }

  const urgent = days != null && days <= 14 && days >= 0;

  return (
    <Card
      className={
        urgent
          ? "border-orange-400/40 bg-gradient-to-br from-orange-400/10 to-transparent"
          : "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
      }
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {goal.location ?? "Course"}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{goal.title}</h3>
          {dateLabel && (
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {dateLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6">
          {days != null && (
            <div className="text-right">
              <p
                className={`font-mono text-3xl font-semibold ${urgent ? "text-orange-400" : "text-primary"}`}
              >
                {days >= 0 ? `J-${days}` : `J+${Math.abs(days)}`}
              </p>
            </div>
          )}
          <button
            onClick={handleDelete}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Supprimer
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricGoalCard({ goal }: { goal: GoalItem }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const progress = computeGoalProgress(goal);
  const remaining = formatRemaining(goal);
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);

  async function handleDelete() {
    if (!confirm(`Supprimer « ${goal.title} » ?`)) return;
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    router.refresh();
  }

  async function toggleAchieved() {
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achieved: !goal.achieved }),
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    router.refresh();
  }

  return (
    <Card className={goal.achieved ? "opacity-60" : undefined}>
      <CardContent className="space-y-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">{goal.title}</h3>
            {goal.horizon && (
              <p className="text-xs text-muted-foreground">
                {horizonLabels[goal.horizon]}
              </p>
            )}
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={toggleAchieved}
              className="text-muted-foreground hover:text-primary"
            >
              {goal.achieved ? "Rouvrir" : "Atteint"}
            </button>
            <button
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              Suppr.
            </button>
          </div>
        </div>

        {progress != null && (
          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}%</span>
              {remaining && <span>{remaining}</span>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Actuel{" "}
            <span className="font-mono text-foreground">
              {formatValue(goal.currentValue, goal.unit)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Cible{" "}
            <span className="font-mono text-primary">
              {formatValue(goal.targetValue, goal.unit)}
            </span>
          </span>
        </div>

        {days != null && (
          <p className="text-xs text-muted-foreground">
            Échéance dans {days} jour{days > 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function GoalsToolbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Nouvel objectif</Button>
      {open && <GoalDialog onClose={() => setOpen(false)} />}
    </>
  );
}

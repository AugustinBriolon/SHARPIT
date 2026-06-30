'use client';

import { GoalHorizon, GoalKind, GoalPriority } from '@prisma/client';
import { Calendar, MapPin, Pencil, Target, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { GoalDialog, type GoalForEdit } from '@/components/goals/goal-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  computeGoalProgress,
  daysUntil,
  formatRemaining,
  horizonLabels,
  priorityAccent,
  priorityLabels,
} from '@/lib/goals';
import { cn } from '@/lib/utils';
import { useGoalMutations } from '@/hooks/use-data';

export interface GoalItem {
  id: string;
  title: string;
  kind: GoalKind;
  horizon: GoalHorizon | null;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  lowerIsBetter: boolean;
  targetDate: string | Date | null;
  location: string | null;
  achieved: boolean;
  notes: string | null;
  priority: GoalPriority | null;
  raceFormat: string | null;
  targetPerformance: string | null;
}

function toEdit(goal: GoalItem): GoalForEdit {
  return {
    id: goal.id,
    title: goal.title,
    kind: goal.kind,
    horizon: goal.horizon,
    startValue: goal.startValue,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    unit: goal.unit,
    lowerIsBetter: goal.lowerIsBetter,
    targetDate: goal.targetDate,
    location: goal.location,
    notes: goal.notes,
    priority: goal.priority,
    raceFormat: goal.raceFormat,
    targetPerformance: goal.targetPerformance,
  };
}

function formatValue(value: number | null, unit: string | null) {
  if (value == null) return '—';
  return unit ? `${value} ${unit}` : String(value);
}

function PriorityBadge({ priority }: { priority: GoalPriority }) {
  const accent = priorityAccent[priority];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${accent}22`, color: accent }}
    >
      {priorityLabels[priority]}
    </span>
  );
}

export function RaceCard({ goal }: { goal: GoalItem }) {
  const { remove } = useGoalMutations();
  const [editing, setEditing] = useState(false);
  const date = goal.targetDate ? new Date(goal.targetDate) : null;
  const days = daysUntil(date);
  const dateLabel = date
    ? new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
    : null;

  function handleDelete() {
    if (!confirm(`Supprimer « ${goal.title} » ?`)) return;
    remove.mutate(goal.id);
  }

  const urgent = days != null && days <= 14 && days >= 0;

  return (
    <>
      <Card
        className={cn(
          urgent
            ? 'border-orange-400/40 bg-linear-to-br from-orange-400/10 to-transparent'
            : 'border-primary/20 from-primary/5 bg-linear-to-br to-transparent',
          goal.achieved && 'opacity-60',
        )}
      >
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {goal.priority && <PriorityBadge priority={goal.priority} />}
                {goal.raceFormat && (
                  <span className="bg-muted/70 text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
                    {goal.raceFormat}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-semibold">{goal.title}</h3>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {dateLabel && (
                  <span className="flex items-center gap-1 capitalize">
                    <Calendar className="size-3.5" />
                    {dateLabel}
                  </span>
                )}
                {goal.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {goal.location}
                  </span>
                )}
              </div>
            </div>
            {days != null && (
              <p
                className={cn(
                  'font-mono text-3xl font-semibold',
                  urgent ? 'text-orange-600' : 'text-primary',
                )}
              >
                {days >= 0 ? `J-${days}` : `J+${Math.abs(days)}`}
              </p>
            )}
          </div>

          {goal.targetPerformance && (
            <div className="border-primary/20 bg-background/60 flex items-center gap-2 rounded-lg border p-2.5">
              <Trophy className="text-primary size-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Objectif visé
                </p>
                <p className="text-sm font-medium">{goal.targetPerformance}</p>
              </div>
            </div>
          )}

          {goal.notes && (
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{goal.notes}</p>
          )}

          <div className="border-border/50 flex items-center justify-end gap-1 border-t pt-3">
            <Button
              className="text-muted-foreground"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" /> Modifier
            </Button>
            <Button
              className="text-muted-foreground hover:text-destructive"
              disabled={remove.isPending}
              size="sm"
              variant="ghost"
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" /> Supprimer
            </Button>
          </div>
        </CardContent>
      </Card>
      {editing && <GoalDialog goal={toEdit(goal)} onClose={() => setEditing(false)} />}
    </>
  );
}

export function MetricGoalCard({ goal }: { goal: GoalItem }) {
  const { update, remove } = useGoalMutations();
  const [editing, setEditing] = useState(false);
  const progress = computeGoalProgress(goal);
  const remaining = formatRemaining(goal);
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);

  function handleDelete() {
    if (!confirm(`Supprimer « ${goal.title} » ?`)) return;
    remove.mutate(goal.id);
  }

  function toggleAchieved() {
    update.mutate({ id: goal.id, data: { achieved: !goal.achieved } });
  }

  return (
    <>
      <Card className={goal.achieved ? 'opacity-60' : undefined}>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 font-medium">
                <Target className="text-primary size-3.5 shrink-0" />
                {goal.title}
              </h3>
              {goal.horizon && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {horizonLabels[goal.horizon]}
                </p>
              )}
            </div>
            <button
              className="bg-muted/60 text-muted-foreground hover:text-primary shrink-0 rounded-full px-2 py-0.5 text-xs"
              disabled={update.isPending}
              onClick={toggleAchieved}
            >
              {goal.achieved ? 'Rouvrir' : 'Atteint'}
            </button>
          </div>

          {progress != null && (
            <div className="space-y-1.5">
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>{progress}%</span>
                {remaining && <span>{remaining}</span>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Actuel{' '}
              <span className="text-foreground font-mono">
                {formatValue(goal.currentValue, goal.unit)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Cible{' '}
              <span className="text-primary font-mono">
                {formatValue(goal.targetValue, goal.unit)}
              </span>
            </span>
          </div>

          {days != null && (
            <p className="text-muted-foreground text-xs">
              Échéance dans {days} jour{days > 1 ? 's' : ''}
            </p>
          )}

          {goal.notes && (
            <p className="text-muted-foreground text-xs whitespace-pre-wrap">{goal.notes}</p>
          )}

          <div className="border-border/50 flex items-center justify-end gap-1 border-t pt-3">
            <Button
              className="text-muted-foreground"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" /> Modifier
            </Button>
            <Button
              className="text-muted-foreground hover:text-destructive"
              disabled={remove.isPending}
              size="sm"
              variant="ghost"
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" /> Suppr.
            </Button>
          </div>
        </CardContent>
      </Card>
      {editing && <GoalDialog goal={toEdit(goal)} onClose={() => setEditing(false)} />}
    </>
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

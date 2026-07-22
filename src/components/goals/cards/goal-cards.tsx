'use client';

import { GoalHorizon, GoalKind, GoalPriority } from '@prisma/client';
import { Calendar, MapPin, Pencil, Target, Trash2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { GoalDialog, type GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  computeGoalProgress,
  daysUntil,
  formatRemaining,
  horizonLabels,
  priorityAccent,
  priorityLabels,
} from '@/lib/goals/goals';
import {
  describeMetricGoal,
  formatGoalDisplayValue,
  parseGoalMetricConfig,
} from '@/lib/goals/goal-metric-config';
import { cn } from '@/lib/utils';
import { useGoalMutations } from '@/hooks/use-data';

function metricGoalSubtitle(goal: GoalItem, subtitle: string | null): React.ReactNode {
  if (subtitle) {
    return <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>;
  }
  if (goal.horizon) {
    return <p className="text-muted-foreground mt-0.5 text-xs">{horizonLabels[goal.horizon]}</p>;
  }
  return null;
}

export interface GoalItem {
  id: string;
  title: string;
  kind: GoalKind;
  horizon: GoalHorizon | null;
  metricKey?: string | null;
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
  validatingActivityId?: string | null;
  lastAchievedAt?: string | Date | null;
}

function toEdit(goal: GoalItem): GoalForEdit {
  return {
    id: goal.id,
    title: goal.title,
    kind: goal.kind,
    horizon: goal.horizon,
    metricKey: goal.metricKey,
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
    validatingActivityId: goal.validatingActivityId,
    lastAchievedAt: goal.lastAchievedAt,
  };
}

function formatValue(value: number | null, unit: string | null, metricKey?: string | null) {
  const config = parseGoalMetricConfig(metricKey);
  return formatGoalDisplayValue(value, unit, config);
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
  const { confirm, dialog } = useConfirmDialog();
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

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Supprimer « ${goal.title} » ?`,
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    remove.mutate(goal.id);
  }

  const urgent = days != null && days <= 14 && days >= 0;

  return (
    <>
      <Card
        className={cn(
          urgent
            ? 'border-signal-caution/40 bg-signal-caution/10'
            : 'border-primary/20 bg-primary/5',
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
                  urgent ? 'text-signal-caution' : 'text-primary',
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
                <p className="text-label">Objectif visé</p>
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
      {dialog}
    </>
  );
}

export function MetricGoalCard({ goal }: { goal: GoalItem }) {
  const { update, remove } = useGoalMutations();
  const [editing, setEditing] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const metricConfig = parseGoalMetricConfig(goal.metricKey);
  const subtitle = describeMetricGoal(metricConfig, goal.targetDate);
  const progress = computeGoalProgress(goal);
  const remaining = formatRemaining(goal);
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);
  const isAutoTracked = Boolean(metricConfig);

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Supprimer « ${goal.title} » ?`,
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
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
              {metricGoalSubtitle(goal, subtitle)}
            </div>
            <button
              className="bg-muted/60 text-muted-foreground hover:text-primary shrink-0 rounded-full px-2 py-0.5 text-xs"
              disabled={update.isPending}
              onClick={toggleAchieved}
            >
              {goal.achieved ? 'Rouvrir' : 'Atteint'}
            </button>
          </div>

          {goal.achieved && isAutoTracked && (
            <div className="border-primary/20 bg-primary/5 flex flex-col gap-1 rounded-lg border p-2.5 text-xs">
              <p className="text-primary flex items-center gap-1.5 font-medium">
                <Trophy className="size-3.5" />
                Objectif atteint
                {goal.lastAchievedAt && (
                  <span className="text-muted-foreground font-normal">
                    ·{' '}
                    {new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(goal.lastAchievedAt))}
                  </span>
                )}
              </p>
              {goal.validatingActivityId && metricConfig?.template === 'performance' && (
                <Link
                  className="text-primary font-medium hover:underline"
                  href={`/training/${goal.validatingActivityId}`}
                >
                  Voir la séance validante →
                </Link>
              )}
            </div>
          )}

          {progress != null && !goal.achieved && (
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
              {metricConfig?.template === 'performance' ? 'Meilleur' : 'Actuel'}{' '}
              <span className="text-foreground font-mono">
                {formatValue(goal.currentValue, goal.unit, goal.metricKey)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Cible{' '}
              <span className="text-primary font-mono">
                {formatValue(goal.targetValue, goal.unit, goal.metricKey)}
              </span>
            </span>
          </div>

          {isAutoTracked && (
            <p className="text-muted-foreground text-xs">
              Progression calculée depuis tes activités synchronisées.
            </p>
          )}

          {days != null && !isAutoTracked && goal.targetDate && (
            <p className="text-muted-foreground text-xs">
              Échéance dans {days} jour{days > 1 ? 's' : ''}
            </p>
          )}

          {isAutoTracked && goal.targetDate && (
            <p className="text-muted-foreground text-xs">
              Jusqu&apos;au{' '}
              {new Intl.DateTimeFormat('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(goal.targetDate))}
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
      {dialog}
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

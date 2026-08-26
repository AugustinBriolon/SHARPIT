'use client';

import { GoalHorizon, GoalKind, GoalPriority } from '@prisma/client';
import {
  Calendar,
  CheckCircle2,
  MapPin,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { Button } from '@/components/ui/button';
import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  computeGoalProgress,
  daysUntil,
  formatRemaining,
  horizonLabels,
  priorityDescriptions,
  priorityLabels,
} from '@/lib/goals/goals';
import {
  describeMetricGoal,
  formatGoalDisplayValue,
  parseGoalMetricConfig,
} from '@/lib/goals/goal-metric-config';
import { cn } from '@/lib/utils';
import { useGoalMutations } from '@/hooks/use-data';

const GoalDialog = dynamic(
  () => import('@/components/goals/dialogs/goal-dialog').then((mod) => mod.GoalDialog),
  { ssr: false },
);

function metricGoalSubtitle(goal: GoalItem, subtitle: string | null): ReactNode {
  if (subtitle) {
    return <CardDescription className="mt-0.5 text-xs">{subtitle}</CardDescription>;
  }
  if (goal.horizon) {
    return (
      <CardDescription className="mt-0.5 text-xs">{horizonLabels[goal.horizon]}</CardDescription>
    );
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

function formatShortDate(value: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatLongDate(value: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function countdownLabel(days: number): string {
  if (days > 0) return `J-${days}`;
  if (days < 0) return `J+${Math.abs(days)}`;
  return 'Jour J';
}

function deadlineCopy(days: number): string {
  if (days < 0)
    return `Échéance dépassée de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
  if (days === 0) return 'Échéance aujourd’hui';
  if (days === 1) return 'Échéance demain';
  return `Échéance dans ${days} jours`;
}

function taperWindowCopy(days: number | null): string | null {
  if (days == null || days < 0 || days > 14) return null;
  if (days === 0) return 'Jour de course';
  return 'Fenêtre d’affûtage';
}

/** Lab annotation — rank in primary ink for A, quieter for B/C. */
function PriorityAnnotation({ priority }: { priority: GoalPriority }) {
  return (
    <p className="text-muted-foreground text-xs leading-snug">
      <span
        className={cn(
          'font-medium',
          priority === GoalPriority.A ? 'text-primary' : 'text-foreground',
        )}
      >
        {priorityLabels[priority]}
      </span>
      <span aria-hidden> — </span>
      {priorityDescriptions[priority]}
    </p>
  );
}

function GoalProgressTrack({
  progress,
  remaining,
}: {
  progress: number;
  remaining: string | null;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="space-y-1.5">
      <div
        aria-label="Progression vers la cible"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped} %${remaining ? ` · ${remaining}` : ''}`}
        className="bg-primary/15 h-1 w-full overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
        <span className="text-primary font-medium">{clamped} %</span>
        {remaining ? <span>{remaining}</span> : null}
      </div>
    </div>
  );
}

function AchievedStatus({
  lastAchievedAt,
  validatingActivityId,
  showValidatingLink,
}: {
  lastAchievedAt?: string | Date | null;
  validatingActivityId?: string | null;
  showValidatingLink?: boolean;
}) {
  return (
    <div className="border-primary space-y-1 border-l pl-3 text-xs">
      <p className="text-primary font-medium">
        Objectif atteint
        {lastAchievedAt ? (
          <span className="text-muted-foreground font-normal">
            {' '}
            · {formatShortDate(lastAchievedAt)}
          </span>
        ) : null}
      </p>
      {showValidatingLink && validatingActivityId && (
        <Link
          className="text-primary font-medium hover:underline"
          href={`/training/${validatingActivityId}`}
        >
          Voir la séance validante →
        </Link>
      )}
    </div>
  );
}

function GoalActionsMenu({
  achieved,
  onToggleAchieved,
  updatePending,
  onEdit,
  onDelete,
  deletePending,
}: {
  achieved: boolean;
  onToggleAchieved: () => void;
  updatePending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Actions de l’objectif"
        className={cn(
          'text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg',
          'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          disabled={updatePending}
          onClick={onToggleAchieved}
        >
          {achieved ? (
            <RotateCcw className="size-3.5" aria-hidden />
          ) : (
            <CheckCircle2 className="size-3.5" aria-hidden />
          )}
          {achieved ? 'Rouvrir' : 'Marquer atteint'}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          disabled={deletePending}
          variant="destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GoalCardFooter({
  goalId,
  achieved,
  onToggleAchieved,
  updatePending,
  onEdit,
  onDelete,
  deletePending,
}: {
  goalId: string;
  achieved: boolean;
  onToggleAchieved: () => void;
  updatePending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <CardFooter className="justify-between gap-2">
      <DiscussWithCoachButton
        label="Discuter"
        size="sm"
        target={{ kind: 'goal', goalId }}
        variant="ghost"
      />
      <GoalActionsMenu
        achieved={achieved}
        deletePending={deletePending}
        updatePending={updatePending}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleAchieved={onToggleAchieved}
      />
    </CardFooter>
  );
}

function useGoalCardControls(goal: GoalItem) {
  const { update, remove } = useGoalMutations();
  const [editing, setEditing] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

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

  return {
    editing,
    setEditing,
    dialog,
    handleDelete,
    toggleAchieved,
    updatePending: update.isPending,
    deletePending: remove.isPending,
  };
}

export function RaceCard({ goal }: { goal: GoalItem }) {
  const {
    editing,
    setEditing,
    dialog,
    handleDelete,
    toggleAchieved,
    updatePending,
    deletePending,
  } = useGoalCardControls(goal);
  const date = goal.targetDate ? new Date(goal.targetDate) : null;
  const days = daysUntil(date);
  const dateLabel = date ? formatLongDate(date) : null;
  const taperCopy = taperWindowCopy(days);
  const metricConfig = parseGoalMetricConfig(goal.metricKey);

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              {goal.priority ? <PriorityAnnotation priority={goal.priority} /> : null}
              {goal.raceFormat ? (
                <p className="text-primary/80 text-label">{goal.raceFormat}</p>
              ) : null}
              <CardTitle>{goal.title}</CardTitle>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {dateLabel ? (
                  <span className="flex items-center gap-1 capitalize">
                    <Calendar className="text-primary size-3.5" aria-hidden />
                    {dateLabel}
                  </span>
                ) : null}
                {goal.location ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="text-primary size-3.5" aria-hidden />
                    {goal.location}
                  </span>
                ) : null}
              </div>
              {taperCopy ? <p className="text-primary text-xs font-medium">{taperCopy}</p> : null}
            </div>
            {days != null ? (
              <p className="text-data text-primary font-mono text-3xl font-semibold tabular-nums">
                {countdownLabel(days)}
              </p>
            ) : null}
          </div>

          {goal.targetPerformance ? (
            <div className="bg-primary/5 rounded-analysis px-3 py-2">
              <p className="text-label text-primary">Objectif visé</p>
              <p className="text-sm font-medium">{goal.targetPerformance}</p>
            </div>
          ) : null}

          {goal.achieved ? (
            <AchievedStatus
              lastAchievedAt={goal.lastAchievedAt}
              showValidatingLink={metricConfig?.template === 'performance'}
              validatingActivityId={goal.validatingActivityId}
            />
          ) : null}

          {goal.notes ? (
            <p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-wrap">
              {goal.notes}
            </p>
          ) : null}
        </CardContent>
        <GoalCardFooter
          achieved={goal.achieved}
          deletePending={deletePending}
          goalId={goal.id}
          updatePending={updatePending}
          onDelete={handleDelete}
          onEdit={() => setEditing(true)}
          onToggleAchieved={toggleAchieved}
        />
      </Card>
      {editing ? <GoalDialog goal={toEdit(goal)} onClose={() => setEditing(false)} /> : null}
      {dialog}
    </>
  );
}

export function MetricGoalCard({ goal }: { goal: GoalItem }) {
  const {
    editing,
    setEditing,
    dialog,
    handleDelete,
    toggleAchieved,
    updatePending,
    deletePending,
  } = useGoalCardControls(goal);
  const metricConfig = parseGoalMetricConfig(goal.metricKey);
  const subtitle = describeMetricGoal(metricConfig, goal.targetDate);
  const progress = computeGoalProgress(goal);
  const remaining = formatRemaining(goal);
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);
  const isAutoTracked = Boolean(metricConfig);

  return (
    <>
      <Card>
        <CardContent className="space-y-3">
          <div className="min-w-0">
            <CardTitle>{goal.title}</CardTitle>
            {metricGoalSubtitle(goal, subtitle)}
          </div>

          {goal.achieved ? (
            <AchievedStatus
              lastAchievedAt={goal.lastAchievedAt}
              showValidatingLink={isAutoTracked && metricConfig?.template === 'performance'}
              validatingActivityId={goal.validatingActivityId}
            />
          ) : null}

          {progress != null && !goal.achieved ? (
            <GoalProgressTrack progress={progress} remaining={remaining} />
          ) : null}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {metricConfig?.template === 'performance' ? 'Meilleur' : 'Actuel'}{' '}
              <span className="text-foreground font-mono tabular-nums">
                {formatValue(goal.currentValue, goal.unit, goal.metricKey)}
              </span>
            </span>
            <span className="text-muted-foreground">
              Cible{' '}
              <span className="text-primary font-mono tabular-nums">
                {formatValue(goal.targetValue, goal.unit, goal.metricKey)}
              </span>
            </span>
          </div>

          {isAutoTracked ? (
            <p className="text-muted-foreground text-xs">
              Progression calculée depuis tes activités synchronisées.
            </p>
          ) : null}

          {days != null && !isAutoTracked && goal.targetDate ? (
            <p className="text-muted-foreground text-xs">{deadlineCopy(days)}</p>
          ) : null}

          {isAutoTracked && goal.targetDate ? (
            <p className="text-muted-foreground text-xs">
              Jusqu&apos;au {formatLongDate(goal.targetDate)}
            </p>
          ) : null}

          {goal.notes ? (
            <p className="text-muted-foreground line-clamp-3 text-xs whitespace-pre-wrap">
              {goal.notes}
            </p>
          ) : null}
        </CardContent>
        <GoalCardFooter
          achieved={goal.achieved}
          deletePending={deletePending}
          goalId={goal.id}
          updatePending={updatePending}
          onDelete={handleDelete}
          onEdit={() => setEditing(true)}
          onToggleAchieved={toggleAchieved}
        />
      </Card>
      {editing ? <GoalDialog goal={toEdit(goal)} onClose={() => setEditing(false)} /> : null}
      {dialog}
    </>
  );
}

export function GoalsToolbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Nouvel objectif
      </Button>
      {open ? <GoalDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

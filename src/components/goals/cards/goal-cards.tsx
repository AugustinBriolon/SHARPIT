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

import {
  countdownLabel,
  deadlineCopy,
  formatLongDate,
  metricGoalSubtitle,
  RaceCardDetails,
  taperWindowCopy,
} from '@/components/goals/cards/goal-card-format';
import { AchievedStatus, GoalProgressTrack } from '@/components/goals/cards/goal-cards-parts';
import { MetricGoalCardBody } from '@/components/goals/cards/metric-goal-card-body';

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
    if (!confirmed) {
      return;
    }
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
  const metricConfig = parseGoalMetricConfig(goal.metricKey);

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <RaceCardDetails goal={goal} />

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

  return (
    <>
      <Card>
        <MetricGoalCardBody goal={goal} />
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

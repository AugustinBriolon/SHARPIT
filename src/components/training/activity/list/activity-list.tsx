'use client';

import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { LinkButton } from '@/components/ui/link-button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useActivityMutations } from '@/hooks/use-data';
import { cn } from '@/lib/utils';
import { Dumbbell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ActivityChip } from '@/components/training/activity/list/activity-list-chip';
import { ActivityRow } from '@/components/training/activity/list/activity-list-row';
import type { ActivityListItem } from '@/components/training/activity/list/activity-list-types';
import { navStack } from '@/lib/navigation/nav-stack';

function ActivityListEmpty({ emptyLabel }: { emptyLabel?: string }) {
  const description = emptyLabel
    ? undefined
    : 'Commence par une saisie manuelle ou synchronise une source connectée.';
  const action = emptyLabel ? undefined : (
    <LinkButton className="mt-1" href="/activite/nouvelle" size="sm">
      Saisir une séance manuellement
    </LinkButton>
  );

  return (
    <InkEmptyState
      action={action}
      description={description}
      icon={Dumbbell}
      title={emptyLabel ?? 'Aucune séance enregistrée'}
      bleed
    />
  );
}

function ActivityChipList({
  activities,
  chipListClassName,
  recordLabelsById,
  selectionMode,
  selectedIds,
  onToggle,
}: {
  activities: ActivityListItem[];
  chipListClassName?: string;
  recordLabelsById?: Map<string, string>;
  selectionMode: boolean;
  selectedIds?: Set<string>;
  onToggle?: (activityId: string) => void;
}) {
  return (
    <ul className={cn('space-y-2', chipListClassName)}>
      {activities.map((activity) => (
        <li key={activity.id} className="cv-auto min-w-0">
          <ActivityChip
            activity={activity}
            recordLabel={recordLabelsById?.get(activity.id) ?? null}
            selected={selectedIds?.has(activity.id) ?? false}
            selectionMode={selectionMode}
            onToggle={onToggle}
          />
        </li>
      ))}
    </ul>
  );
}

function ActivityPanelList({
  activities,
  compact,
  selectionMode,
  selectedIds,
  onToggle,
}: {
  activities: ActivityListItem[];
  compact: boolean;
  selectionMode: boolean;
  selectedIds?: Set<string>;
  onToggle?: (activityId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="cv-auto">
          <ActivityRow
            activity={activity}
            compact={compact}
            selected={selectedIds?.has(activity.id) ?? false}
            selectionMode={selectionMode}
            onToggle={onToggle}
          />
        </div>
      ))}
    </div>
  );
}

export function ActivityList({
  activities,
  emptyLabel,
  compact = false,
  variant = 'panel',
  chipListClassName,
  recordLabelsById,
  selectionMode = false,
  selectedIds,
  onToggle,
}: {
  activities: ActivityListItem[];
  emptyLabel?: string;
  compact?: boolean;
  variant?: 'panel' | 'chip';
  chipListClassName?: string;
  recordLabelsById?: Map<string, string>;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (activityId: string) => void;
}) {
  if (!activities.length) {
    return <ActivityListEmpty emptyLabel={emptyLabel} />;
  }

  if (variant === 'chip') {
    return (
      <ActivityChipList
        activities={activities}
        chipListClassName={chipListClassName}
        recordLabelsById={recordLabelsById}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        onToggle={onToggle}
      />
    );
  }

  return (
    <ActivityPanelList
      activities={activities}
      compact={compact}
      selectedIds={selectedIds}
      selectionMode={selectionMode}
      onToggle={onToggle}
    />
  );
}

export function DeleteActivityButton({ id }: { id: string }) {
  const router = useRouter();
  const { remove } = useActivityMutations();
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Supprimer cette séance ?',
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    remove.mutate(id);
    // Return to origin via stack; empty stack → Activité (never Historique / Fil).
    const previous = navStack.peekBackFrom(`/activite/${id}`);
    router.push(previous?.href ?? '/activite');
  }

  return (
    <>
      <Button size="sm" variant="destructive" onClick={handleDelete}>
        Supprimer
      </Button>
      {dialog}
    </>
  );
}

export type { ActivityListItem };

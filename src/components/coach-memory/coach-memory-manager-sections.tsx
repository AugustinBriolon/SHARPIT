'use client';

import { NotebookPen, Plus } from 'lucide-react';
import { CoachMemoryEntryCard } from '@/components/coach-memory/coach-memory-entry-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { guardedActionLabel } from '@/hooks/use-offline-guard';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';

export function CoachMemoryEntriesList({
  entries,
  focusId,
  loadError,
  loading,
  deletePendingId,
  guardDisabled,
  offline,
  offlineLabel,
  onAdd,
  onDelete,
  onEdit,
}: {
  entries: CoachMemoryEntry[];
  focusId?: string | null;
  loadError: string | null;
  loading: boolean;
  deletePendingId: string | null;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  onAdd: () => void;
  onDelete: (entry: CoachMemoryEntry) => void;
  onEdit: (entry: CoachMemoryEntry) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 px-1 py-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-analysis border-analysis-border border border-dashed px-5 py-8 text-center">
        <p className="text-destructive text-sm">{loadError}</p>
      </div>
    );
  }

  if (entries.length) {
    return (
      <div className="space-y-2.5">
        {entries.map((entry) => (
          <CoachMemoryEntryCard
            key={entry.id}
            deleting={Boolean(deletePendingId) && deletePendingId === entry.id}
            entry={entry}
            highlighted={focusId === entry.id}
            onDelete={() => onDelete(entry)}
            onEdit={() => onEdit(entry)}
          />
        ))}
      </div>
    );
  }

  return (
    <InkEmptyState
      description="Ajoute un déplacement ou une contrainte, ou mentionne-le au coach — seuls les en cours et à venir restent ici."
      icon={NotebookPen}
      title="Aucune contrainte datée"
      action={
        <Button className="mt-1" disabled={guardDisabled} type="button" onClick={onAdd}>
          {offline ? offlineLabel : 'Ajouter'}
        </Button>
      }
      bleed
    />
  );
}

export function CoachMemoryAddButton({
  disabled,
  offline,
  offlineLabel,
  onInk = false,
  onClick,
}: {
  disabled: boolean;
  offline: boolean;
  offlineLabel: string;
  onInk?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      disabled={disabled}
      type="button"
      variant="outline"
      className={
        onInk
          ? 'border-ink-surface-foreground/30 text-ink-surface-foreground hover:bg-ink-surface-foreground/10 hover:text-ink-surface-foreground bg-transparent'
          : undefined
      }
      onClick={onClick}
    >
      <Plus className="size-4" aria-hidden />
      {guardedActionLabel(offline, offlineLabel, onInk ? 'Ajouter une contrainte' : 'Ajouter')}
    </Button>
  );
}

export function CoachMemoryDeleteDialog({
  deleteTarget,
  guardDisabled,
  offline,
  offlineLabel,
  removePending,
  onClose,
  onConfirm,
}: {
  deleteTarget: CoachMemoryEntry | null;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  removePending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Supprimer cette entrée ?</DialogTitle>
          <DialogDescription>
            {deleteTarget?.label?.trim() ||
              'Cette entrée sera retirée de la mémoire du coach. Les séances déjà mises à jour conservent leur lieu actuel.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={guardDisabled || removePending}
            type="button"
            variant="destructive"
            onClick={onConfirm}
          >
            {guardedActionLabel(offline, offlineLabel, 'Supprimer', {
              active: removePending,
              label: 'Suppression…',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

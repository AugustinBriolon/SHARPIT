'use client';

import { NotebookPen, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CoachMemoryEntryCard } from '@/components/coach-memory/coach-memory-entry-card';
import { CoachProfileContextSection } from '@/components/coach-memory/coach-profile-context-section';
import { TravelMemoryFormDialog } from '@/components/coach-memory/travel-memory-form-dialog';
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
import { toast } from '@/components/ui/toast';
import { useCoachMemory, useCoachMemoryMutations } from '@/hooks/use-coach-memory';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';

export function CoachMemoryManager({ focusId = null }: { focusId?: string | null }) {
  const query = useCoachMemory();
  const { create, update, remove } = useCoachMemoryMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CoachMemoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachMemoryEntry | null>(null);

  useEffect(() => {
    if (!focusId || !query.data?.entries.length) return;
    const element = document.getElementById(`memory-${focusId}`);
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, [focusId, query.data?.entries]);

  function openCreate() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEdit(entry: CoachMemoryEntry) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  async function handleSubmit(payload: Parameters<typeof create.mutateAsync>[0]) {
    try {
      if (editingEntry) {
        await update.mutateAsync({ id: editingEntry.id, payload });
        toast.success('Entrée mise à jour');
      } else {
        await create.mutateAsync(payload);
        toast.success('Entrée ajoutée à la mémoire du coach');
      }
      setFormOpen(false);
      setEditingEntry(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success('Entrée supprimée');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible');
    }
  }

  const saving = create.isPending || update.isPending;
  const loadError = query.isError
    ? 'Impossible de charger la mémoire. Recharge la page ou réessaie dans un instant.'
    : null;
  const entryCount = query.data?.entries.length ?? 0;

  function renderMemoryEntries() {
    if (query.isLoading) {
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

    if (query.data?.entries.length) {
      return (
        <div className="analysis-panel rounded-analysis-lg px-4 py-1">
          {query.data.entries.map((entry) => (
            <CoachMemoryEntryCard
              key={entry.id}
              deleting={remove.isPending && deleteTarget?.id === entry.id}
              entry={entry}
              highlighted={focusId === entry.id}
              onDelete={() => setDeleteTarget(entry)}
              onEdit={() => openEdit(entry)}
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
          <Button className="mt-1" type="button" onClick={openCreate}>
            Ajouter
          </Button>
        }
        bleed
      />
    );
  }

  return (
    <div className="space-y-8">
      <CoachProfileContextSection
        loadError={loadError}
        loading={query.isLoading}
        savedContext={query.data?.profileContext ?? ''}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label mb-2">Daté</p>
            <h2 className="text-section-title">Déplacements & contraintes</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Lieu, dates et capacité d&apos;entraînement — météo, outdoor et charge planifiée.
              {entryCount > 0 ? (
                <span className="text-data text-muted-foreground ml-1 tabular-nums">
                  ({entryCount})
                </span>
              ) : null}
            </p>
          </div>
          <Button
            disabled={Boolean(loadError)}
            type="button"
            variant="outline"
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden />
            Ajouter
          </Button>
        </div>

        {renderMemoryEntries()}
      </section>

      <TravelMemoryFormDialog
        key={editingEntry?.id ?? (formOpen ? 'new' : 'closed')}
        entry={editingEntry}
        open={formOpen}
        saving={saving}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette entrée ?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.label?.trim() ||
                'Cette entrée sera retirée de la mémoire du coach. Les séances déjà mises à jour conservent leur lieu actuel.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              disabled={remove.isPending}
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              {remove.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

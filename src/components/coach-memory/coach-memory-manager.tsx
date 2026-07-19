'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CoachMemoryEntryCard } from '@/components/coach-memory/coach-memory-entry-card';
import { CoachMemoryRoadmapTeaser } from '@/components/coach-memory/coach-memory-roadmap-teaser';
import { CoachProfileContextSection } from '@/components/coach-memory/coach-profile-context-section';
import { TravelMemoryFormDialog } from '@/components/coach-memory/travel-memory-form-dialog';
import { Button } from '@/components/ui/button';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  function renderMemoryEntries() {
    if (query.isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
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
        <div className="space-y-3">
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
      <div className="rounded-analysis border-analysis-border border border-dashed px-5 py-10 text-center">
        <p className="text-sm font-medium">Aucune entrée enregistrée</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
          Ajoute un déplacement ou une contrainte manuellement, ou mentionne-le au coach — il
          apparaîtra ici avec le badge « Déduit du coach ».
        </p>
        <Button className="mt-4" type="button" variant="outline" onClick={openCreate}>
          Ajouter
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CoachProfileContextSection
        loadError={loadError}
        loading={query.isLoading}
        savedContext={query.data?.profileContext ?? ''}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <EyebrowLabel className="mb-2" variant="section">
              Mémoire structurée
            </EyebrowLabel>
            <h2 className="text-section-title">Déplacements & contraintes</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Lieu, dates et capacité d&apos;entraînement pour adapter météo, séances outdoor et
              charge planifiée.
            </p>
          </div>
          <Button
            disabled={Boolean(loadError)}
            type="button"
            variant="outline"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>

        {renderMemoryEntries()}
      </section>

      <CoachMemoryRoadmapTeaser />

      <TravelMemoryFormDialog
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

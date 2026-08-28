'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { useCoachMemory, useCoachMemoryMutations } from '@/hooks/use-coach-memory';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';
import type { TravelMemoryPayload } from '@/hooks/use-coach-memory';

export function useCoachMemoryManager(focusId: string | null) {
  const query = useCoachMemory();
  const { create, update, remove } = useCoachMemoryMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CoachMemoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachMemoryEntry | null>(null);

  useResetWhenHidden(() => {
    setFormOpen(false);
    setEditingEntry(null);
    setDeleteTarget(null);
  });

  useEffect(() => {
    if (!focusId || !query.data?.entries.length) {
      return;
    }
    const element = document.getElementById(`memory-${focusId}`);
    if (!element) {
      return;
    }
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

  async function handleSubmit(payload: TravelMemoryPayload) {
    if (guardDisabled) {
      return;
    }
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
    if (!deleteTarget || guardDisabled) {
      return;
    }
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

  return {
    confirmDelete,
    deleteTarget,
    editingEntry,
    entries: query.data?.entries ?? [],
    formOpen,
    guardDisabled,
    handleSubmit,
    loadError,
    loading: query.isLoading,
    offline,
    offlineLabel,
    openCreate,
    openEdit,
    profileContext: query.data?.profileContext ?? '',
    removePending: remove.isPending,
    saving,
    setDeleteTarget,
    setFormOpen,
  };
}

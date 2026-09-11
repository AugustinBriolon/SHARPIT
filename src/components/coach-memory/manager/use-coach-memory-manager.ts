'use client';

import { useCoachMemory, useCoachMemoryMutations } from '@/hooks/use-coach-memory';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import {
  useCoachMemoryCrudHandlers,
  useCoachMemoryFocusScroll,
  useCoachMemoryFormState,
} from '@/components/coach-memory/manager/use-coach-memory-manager-parts';

export function useCoachMemoryManager(focusId: string | null) {
  const query = useCoachMemory();
  const { create, update, remove } = useCoachMemoryMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const form = useCoachMemoryFormState();

  useCoachMemoryFocusScroll(focusId, query.data?.entries);

  const { confirmDelete, handleSubmit } = useCoachMemoryCrudHandlers({
    create,
    update,
    remove,
    guardDisabled,
    editingEntry: form.editingEntry,
    deleteTarget: form.deleteTarget,
    setFormOpen: form.setFormOpen,
    setEditingEntry: form.setEditingEntry,
    setDeleteTarget: form.setDeleteTarget,
  });

  const loadError = query.isError
    ? 'Impossible de charger la mémoire. Recharge la page ou réessaie dans un instant.'
    : null;

  return {
    confirmDelete,
    deleteTarget: form.deleteTarget,
    editingEntry: form.editingEntry,
    entries: query.data?.entries ?? [],
    formOpen: form.formOpen,
    guardDisabled,
    handleSubmit,
    loadError,
    loading: query.isLoading,
    offline,
    offlineLabel,
    openCreate: form.openCreate,
    openEdit: form.openEdit,
    profileContext: query.data?.profileContext ?? '',
    removePending: false,
    saving: false,
    setDeleteTarget: form.setDeleteTarget,
    setFormOpen: form.setFormOpen,
  };
}

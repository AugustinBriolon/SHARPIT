'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import type { CoachMemoryEntry } from '@/lib/coach-memory/core/types';
import type { TravelMemoryPayload } from '@/hooks/use-coach-memory';

export function useCoachMemoryFocusScroll(
  focusId: string | null,
  entries: CoachMemoryEntry[] | undefined,
) {
  useEffect(() => {
    if (!focusId || !entries?.length) {
      return;
    }
    const element = document.getElementById(`memory-${focusId}`);
    if (!element) {
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, [focusId, entries]);
}

export function useCoachMemoryFormState() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CoachMemoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachMemoryEntry | null>(null);

  useResetWhenHidden(() => {
    setFormOpen(false);
    setEditingEntry(null);
    setDeleteTarget(null);
  });

  function openCreate() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEdit(entry: CoachMemoryEntry) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  return {
    deleteTarget,
    editingEntry,
    formOpen,
    openCreate,
    openEdit,
    setDeleteTarget,
    setEditingEntry,
    setFormOpen,
  };
}

type CoachMemoryMutations = {
  create: {
    mutate: (
      payload: TravelMemoryPayload,
      options: { onSuccess: () => void; onError: (error: unknown) => void },
    ) => void;
  };
  update: {
    mutate: (
      args: { id: string; payload: TravelMemoryPayload },
      options: { onSuccess: () => void; onError: (error: unknown) => void },
    ) => void;
  };
  remove: {
    mutate: (
      id: string,
      options: { onSuccess: () => void; onError: (error: unknown) => void },
    ) => void;
  };
};

type CoachMemoryCrudOptions = {
  create: CoachMemoryMutations['create'];
  update: CoachMemoryMutations['update'];
  remove: CoachMemoryMutations['remove'];
  guardDisabled: boolean;
  editingEntry: CoachMemoryEntry | null;
  deleteTarget: CoachMemoryEntry | null;
  setFormOpen: (open: boolean) => void;
  setEditingEntry: (entry: CoachMemoryEntry | null) => void;
  setDeleteTarget: (entry: CoachMemoryEntry | null) => void;
};

function createCoachMemorySubmitHandler(options: CoachMemoryCrudOptions) {
  const { create, update, guardDisabled, editingEntry, setFormOpen, setEditingEntry } = options;

  return function handleSubmit(payload: TravelMemoryPayload) {
    if (guardDisabled) {
      return;
    }
    // Instant UX: close form immediately — mutations already patch cache.
    setFormOpen(false);
    const wasEditing = editingEntry;
    setEditingEntry(null);

    if (wasEditing) {
      update.mutate(
        { id: wasEditing.id, payload },
        {
          onSuccess: () => toast.success('Entrée mise à jour'),
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Action impossible');
            setEditingEntry(wasEditing);
            setFormOpen(true);
          },
        },
      );
      return;
    }

    create.mutate(payload, {
      onSuccess: () => toast.success('Entrée ajoutée à la mémoire du coach'),
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Action impossible');
        setFormOpen(true);
      },
    });
  };
}

function createCoachMemoryDeleteHandler(options: CoachMemoryCrudOptions) {
  const { remove, guardDisabled, deleteTarget, setDeleteTarget } = options;

  return function confirmDelete() {
    if (!deleteTarget || guardDisabled) {
      return;
    }
    const target = deleteTarget;
    setDeleteTarget(null);
    remove.mutate(target.id, {
      onSuccess: () => toast.success('Entrée supprimée'),
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Suppression impossible');
        setDeleteTarget(target);
      },
    });
  };
}

export function useCoachMemoryCrudHandlers(options: CoachMemoryCrudOptions) {
  return {
    confirmDelete: createCoachMemoryDeleteHandler(options),
    handleSubmit: createCoachMemorySubmitHandler(options),
  };
}

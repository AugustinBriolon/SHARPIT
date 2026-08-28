'use client';

import { BodySide, PhysicalCategory, PhysicalStatus } from '@prisma/client';
import { useMemo, useState } from 'react';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { COMMON_BODY_PARTS } from '@/lib/physical';
import { usePhysicalNoteMutations } from '@/hooks/use-physical';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { buildPhysicalNotePayload } from '@/components/physical-health/dialogs/physical-note-dialog-helpers';

const DEFAULT_PHYSICAL_NOTE_FORM = {
  category: 'PAIN' as PhysicalCategory,
  status: 'ACTIVE' as PhysicalStatus,
  side: 'NA' as BodySide,
  bodyPart: '',
  severity: 3,
  affectsTraining: true,
};

function initialPhysicalNoteForm(note?: ClientPhysicalNote | null) {
  if (!note) {
    return DEFAULT_PHYSICAL_NOTE_FORM;
  }
  return {
    category: note.category,
    status: note.status,
    side: note.side,
    bodyPart: note.bodyPart ?? '',
    severity: note.severity ?? 3,
    affectsTraining: note.affectsTraining ?? true,
  };
}

export function usePhysicalNoteDialogState(note?: ClientPhysicalNote | null) {
  const isEdit = Boolean(note);
  const mutations = usePhysicalNoteMutations();
  const { guardDisabled, offline, offlineLabel } = useOfflineGuard();
  const { confirm, dialog } = useConfirmDialog();
  const initial = initialPhysicalNoteForm(note);

  const [category, setCategory] = useState<PhysicalCategory>(initial.category);
  const [status, setStatus] = useState<PhysicalStatus>(initial.status);
  const [side, setSide] = useState<BodySide>(initial.side);
  const [bodyPart, setBodyPart] = useState(initial.bodyPart);
  const [severity, setSeverity] = useState<number>(initial.severity);
  const [affectsTraining, setAffectsTraining] = useState(initial.affectsTraining);
  const [error, setError] = useState<string | null>(null);

  const bodyPartOptions = useMemo(() => {
    const parts = [...COMMON_BODY_PARTS];
    if (bodyPart && !parts.includes(bodyPart)) {
      parts.unshift(bodyPart);
    }
    return parts;
  }, [bodyPart]);

  const pending =
    mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;
  const initialDate = note?.startDate ? new Date(note.startDate) : new Date();

  return {
    isEdit,
    mutations,
    guardDisabled,
    offline,
    offlineLabel,
    confirm,
    dialog,
    category,
    setCategory,
    status,
    setStatus,
    side,
    setSide,
    bodyPart,
    setBodyPart,
    severity,
    setSeverity,
    affectsTraining,
    setAffectsTraining,
    error,
    setError,
    bodyPartOptions,
    pending,
    initialDate,
  };
}

async function persistPhysicalNote(
  isEdit: boolean,
  note: ClientPhysicalNote | null | undefined,
  payload: ReturnType<typeof buildPhysicalNotePayload>,
  mutations: ReturnType<typeof usePhysicalNoteMutations>,
) {
  if (isEdit && note) {
    await mutations.update.mutateAsync({ id: note.id, data: payload });
    return;
  }
  await mutations.create.mutateAsync(payload);
}

export function usePhysicalNoteDialogHandlers(
  state: ReturnType<typeof usePhysicalNoteDialogState>,
  onClose: () => void,
  note?: ClientPhysicalNote | null,
) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.guardDisabled) {
      return;
    }
    state.setError(null);
    const payload = buildPhysicalNotePayload({
      form: new FormData(e.currentTarget),
      category: state.category,
      status: state.status,
      side: state.side,
      severity: state.severity,
      affectsTraining: state.affectsTraining,
      bodyPart: state.bodyPart,
    });
    if (!payload.title) {
      state.setError('Le titre est requis');
      return;
    }
    try {
      await persistPhysicalNote(state.isEdit, note, payload, state.mutations);
      onClose();
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleDelete() {
    if (!note || state.guardDisabled) {
      return;
    }
    const confirmed = await state.confirm({
      title: 'Supprimer cette note et son historique ?',
      description: 'Toutes les check-ins associés seront aussi supprimés.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    try {
      await state.mutations.remove.mutateAsync(note.id);
      onClose();
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return { handleSubmit, handleDelete };
}

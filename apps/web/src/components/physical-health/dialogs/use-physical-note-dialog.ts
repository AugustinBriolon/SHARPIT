'use client';

import type { ClientPhysicalNote } from '@/lib/query/types';
import { usePhysicalNoteMutations } from '@/hooks/use-physical';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  deletePhysicalNote,
  initialPhysicalNoteForm,
  submitPhysicalNote,
  usePhysicalNoteFormFields,
} from '@/components/physical-health/dialogs/use-physical-note-dialog-parts';

export function usePhysicalNoteDialogState(note?: ClientPhysicalNote | null) {
  const isEdit = Boolean(note);
  const mutations = usePhysicalNoteMutations();
  const { guardDisabled, offline, offlineLabel } = useOfflineGuard();
  const { confirm, dialog } = useConfirmDialog();
  const fields = usePhysicalNoteFormFields(initialPhysicalNoteForm(note));

  const pending = false; // Instant close — never block submit on network pending.
  const initialDate = note?.startDate ? new Date(note.startDate) : new Date();

  return {
    isEdit,
    mutations,
    guardDisabled,
    offline,
    offlineLabel,
    confirm,
    dialog,
    ...fields,
    pending,
    initialDate,
  };
}

export function usePhysicalNoteDialogHandlers(
  state: ReturnType<typeof usePhysicalNoteDialogState>,
  onClose: () => void,
  note?: ClientPhysicalNote | null,
) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    submitPhysicalNote(state, e, onClose, note);
  }

  async function handleDelete() {
    await deletePhysicalNote(state, onClose, note);
  }

  return { handleSubmit, handleDelete };
}

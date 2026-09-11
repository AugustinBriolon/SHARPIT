'use client';

import { BodySide, PhysicalCategory, PhysicalStatus } from '@prisma/client';
import { useMemo, useState } from 'react';
import type { ClientPhysicalNote } from '@/lib/query/types';
import { COMMON_BODY_PARTS } from '@/lib/physical';
import type { PhysicalNotePayload } from '@/hooks/use-physical';
import { buildPhysicalNotePayload } from '@/components/physical-health/dialogs/physical-note-dialog-helpers';

export const DEFAULT_PHYSICAL_NOTE_FORM = {
  category: 'PAIN' as PhysicalCategory,
  status: 'ACTIVE' as PhysicalStatus,
  side: 'NA' as BodySide,
  bodyPart: '',
  severity: 3,
  affectsTraining: true,
};

export function initialPhysicalNoteForm(note?: ClientPhysicalNote | null) {
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

export function usePhysicalNoteFormFields(initial: ReturnType<typeof initialPhysicalNoteForm>) {
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

  return {
    affectsTraining,
    bodyPart,
    bodyPartOptions,
    category,
    error,
    severity,
    setAffectsTraining,
    setBodyPart,
    setCategory,
    setError,
    setSeverity,
    setSide,
    setStatus,
    side,
    status,
  };
}

type PhysicalNoteDialogState = ReturnType<typeof usePhysicalNoteFormFields> & {
  guardDisabled: boolean;
  isEdit: boolean;
  mutations: {
    create: { mutate: (payload: PhysicalNotePayload) => void };
    update: { mutate: (args: { id: string; data: PhysicalNotePayload }) => void };
    remove: { mutate: (id: string) => void };
  };
  confirm: (options: {
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'destructive';
  }) => Promise<boolean>;
};

export function submitPhysicalNote(
  state: PhysicalNoteDialogState,
  e: React.FormEvent<HTMLFormElement>,
  onClose: () => void,
  note?: ClientPhysicalNote | null,
) {
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

  // Instant UX: close first — hook already patches cache in onMutate.
  onClose();
  if (state.isEdit && note) {
    state.mutations.update.mutate({ id: note.id, data: payload });
    return;
  }
  state.mutations.create.mutate(payload);
}

export async function deletePhysicalNote(
  state: PhysicalNoteDialogState,
  onClose: () => void,
  note?: ClientPhysicalNote | null,
) {
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
  onClose();
  state.mutations.remove.mutate(note.id);
}

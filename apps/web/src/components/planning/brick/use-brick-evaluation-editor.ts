'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { useBrickEvaluation, useSaveBrickEvaluation } from '@/hooks/use-data';
import type { ClientBrickEvaluation } from '@/hooks/use-data';
import type { BrickEvaluationDraft } from './brick-evaluation-dialog';

export function draftFromEvaluation(
  evaluation: ClientBrickEvaluation | null,
): BrickEvaluationDraft {
  return {
    feeling: evaluation?.feeling ?? null,
    rpe: evaluation?.rpe ?? null,
    transitionRating: evaluation?.transitionRating ?? null,
    notes: evaluation?.notes ?? '',
  };
}

export function useBrickEvaluationEditor(brickGroupId: string) {
  const evaluationQuery = useBrickEvaluation(brickGroupId);
  const save = useSaveBrickEvaluation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BrickEvaluationDraft>(() => draftFromEvaluation(null));
  const evaluation = evaluationQuery.data ?? null;

  function openEditor() {
    setDraft(draftFromEvaluation(evaluation));
    setOpen(true);
  }

  function handleSave() {
    const notes = draft.notes.trim();
    save.mutate(
      { brickGroupId, ...draft, notes: notes || null },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success('Évaluation du brick enregistrée');
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : "L'évaluation n'a pas été enregistrée.",
          ),
      },
    );
  }

  return {
    evaluation,
    open,
    draft,
    isSaving: save.isPending,
    openEditor,
    setOpen,
    patchDraft: (patch: Partial<BrickEvaluationDraft>) =>
      setDraft((previous) => ({ ...previous, ...patch })),
    handleSave,
  };
}

'use client';

import { useEffect, useState } from 'react';
import { useActivityMutations } from '@/hooks/use-data';
import { toast } from '@/components/ui/toast';

/**
 * The draft starts empty rather than on a default RPE: a tile shown as selected
 * is a number the athlete never chose, and it would be saved as if they had.
 */
function useFeelingEditorDraft(feeling: string, rpe: number | null, open: boolean) {
  const [editRpe, setEditRpe] = useState<number | null>(rpe);
  const [editFeeling, setEditFeeling] = useState(feeling);

  useEffect(() => {
    if (open) {
      return;
    }
    setEditRpe(rpe);
    setEditFeeling(feeling);
  }, [feeling, open, rpe]);

  return { editRpe, setEditRpe, editFeeling, setEditFeeling };
}

function saveActivityFeeling({
  activityId,
  editRpe,
  editFeeling,
  update,
  setFeelingError,
  setOpen,
}: {
  activityId: string;
  editRpe: number | null;
  editFeeling: string;
  update: ReturnType<typeof useActivityMutations>['update'];
  setFeelingError: (value: string | null) => void;
  setOpen: (open: boolean) => void;
}) {
  if (!editFeeling) {
    setFeelingError('Choisis un ressenti.');
    return;
  }
  if (editRpe === null) {
    setFeelingError('Choisis un effort perçu.');
    return;
  }
  setFeelingError(null);
  setOpen(false);
  update.mutate(
    { id: activityId, data: { rpe: editRpe, feeling: editFeeling } },
    {
      onSuccess: () => {
        toast.success('Ressenti enregistré');
      },
    },
  );
}

export function useActivityFeelingEditor({
  activityId,
  feeling,
  rpe,
}: {
  activityId: string;
  feeling: string;
  rpe: number | null;
}) {
  const { update } = useActivityMutations();
  const [open, setOpen] = useState(false);
  const [feelingError, setFeelingError] = useState<string | null>(null);
  const draft = useFeelingEditorDraft(feeling, rpe, open);

  function openDialog() {
    draft.setEditRpe(rpe);
    draft.setEditFeeling(feeling);
    setFeelingError(null);
    setOpen(true);
  }

  function handleSave() {
    saveActivityFeeling({
      activityId,
      editRpe: draft.editRpe,
      editFeeling: draft.editFeeling,
      update,
      setFeelingError,
      setOpen,
    });
  }

  return {
    open,
    setOpen,
    ...draft,
    feelingError,
    setFeelingError,
    openDialog,
    handleSave,
  };
}

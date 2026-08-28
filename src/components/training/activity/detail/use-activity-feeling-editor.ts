'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActivityMutations } from '@/hooks/use-data';
import { toast } from '@/components/ui/toast';

export function useActivityFeelingEditor({
  activityId,
  feeling,
  rpe,
}: {
  activityId: string;
  feeling: string;
  rpe: number | null;
}) {
  const router = useRouter();
  const { update } = useActivityMutations();
  const [open, setOpen] = useState(false);
  const [editRpe, setEditRpe] = useState(rpe ?? 5);
  const [editFeeling, setEditFeeling] = useState(feeling);
  const [feelingError, setFeelingError] = useState<string | null>(null);

  function openDialog() {
    setEditRpe(rpe ?? 5);
    setEditFeeling(feeling);
    setFeelingError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!editFeeling) {
      setFeelingError('Choisis un ressenti.');
      return;
    }
    setFeelingError(null);
    setOpen(false);
    update.mutate(
      { id: activityId, data: { rpe: editRpe, feeling: editFeeling } },
      {
        onSuccess: () => {
          toast.success('Ressenti enregistré');
          router.refresh();
        },
      },
    );
  }

  return {
    open,
    setOpen,
    editRpe,
    setEditRpe,
    editFeeling,
    setEditFeeling,
    feelingError,
    setFeelingError,
    openDialog,
    handleSave,
    isPending: update.isPending,
  };
}

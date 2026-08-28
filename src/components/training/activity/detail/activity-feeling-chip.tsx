'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import { ActivityFeelingDialog } from '@/components/training/activity/detail/activity-feeling-dialog';
import { useActivityMutations } from '@/hooks/use-data';
import { toast } from '@/components/ui/toast';

function useActivityFeelingEditor({
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

export function ActivityFeelingChip({
  activityId,
  feeling,
  rpe,
}: {
  activityId: string;
  feeling: string;
  rpe: number | null;
}) {
  const editor = useActivityFeelingEditor({ activityId, feeling, rpe });
  const chipValue = rpe !== null ? `${feeling} · RPE ${rpe}` : feeling;

  return (
    <>
      <ActivityMetaChip
        icon={Smile}
        label="Ressenti"
        value={chipValue}
        onClick={editor.openDialog}
      />
      <ActivityFeelingDialog
        activityId={activityId}
        feeling={editor.editFeeling}
        feelingError={editor.feelingError}
        isPending={editor.isPending}
        open={editor.open}
        rpe={editor.editRpe}
        onOpenChange={editor.setOpen}
        onRpeChange={editor.setEditRpe}
        onSave={() => void editor.handleSave()}
        onFeelingChange={(next) => {
          editor.setEditFeeling(next);
          editor.setFeelingError(null);
        }}
      />
    </>
  );
}

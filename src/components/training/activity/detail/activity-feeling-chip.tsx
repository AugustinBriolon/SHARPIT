'use client';

import { Smile } from 'lucide-react';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import { ActivityFeelingDialog } from '@/components/training/activity/detail/activity-feeling-dialog';
import { useActivityFeelingEditor } from '@/components/training/activity/detail/use-activity-feeling-editor';

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

  return (
    <>
      <ActivityMetaChip icon={Smile} label="Ressenti" value={feeling} onClick={editor.openDialog} />
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

'use client';

import { Smile } from 'lucide-react';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import { ActivityFeelingDialog } from '@/components/training/activity/detail/activity-feeling-dialog';
import { useActivityFeelingEditor } from '@/components/training/activity/detail/use-activity-feeling-editor';

/**
 * Optional chip entry to add session RPE / feeling — never a mandatory banner.
 */
export function ActivityFeelingPrompt({ activityId }: { activityId: string }) {
  const editor = useActivityFeelingEditor({ activityId, feeling: '', rpe: null });

  return (
    <>
      <ActivityMetaChip icon={Smile} label="Ressenti" value="Ajouter" onClick={editor.openDialog} />
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

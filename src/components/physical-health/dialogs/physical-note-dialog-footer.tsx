'use client';

import { Button } from '@/components/ui/button';
import { physicalNoteSubmitLabel } from '@/components/physical-health/dialogs/physical-note-dialog-helpers';

export function PhysicalNoteDialogFooter({
  guardDisabled,
  isEdit,
  offline,
  offlineLabel,
  onClose,
  onDelete,
  pending,
}: {
  guardDisabled: boolean;
  isEdit: boolean;
  offline: boolean;
  offlineLabel: string;
  onClose: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        {isEdit ? (
          <Button
            disabled={guardDisabled || pending}
            type="button"
            variant="destructive"
            onClick={onDelete}
          >
            {offline ? offlineLabel : 'Supprimer'}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button disabled={guardDisabled || pending} type="submit">
          {physicalNoteSubmitLabel(pending, offline, offlineLabel, isEdit)}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { submitButtonLabel } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { Button } from '@/components/ui/button';

export function PlannedSessionFormFooter({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const {
    createMode,
    error,
    guardDisabled,
    handleCancelEdit,
    handleDelete,
    isEdit,
    offline,
    offlineLabel,
    onClose,
    pending,
  } = dialog;

  return (
    <>
      {error ? (
        <p aria-live="assertive" className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div>
          {isEdit ? (
            <Button
              disabled={guardDisabled || pending}
              size="sm"
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              {offline ? offlineLabel : 'Supprimer'}
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            disabled={pending}
            type="button"
            variant="outline"
            onClick={isEdit ? handleCancelEdit : onClose}
          >
            Annuler
          </Button>
          <Button disabled={guardDisabled || pending} type="submit">
            {offline ? offlineLabel : submitButtonLabel(pending, isEdit, createMode)}
          </Button>
        </div>
      </div>
    </>
  );
}
